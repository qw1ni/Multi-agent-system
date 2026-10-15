import { createDatabaseBackup } from '../utils/backupService.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import socketServerInstance from '../websocket/socketServer.js';
import fs from 'fs';
import axios from 'axios';

let parserLogsCache = [];

export const downloadBackup = asyncHandler(async (req, res) => {

  const { filePath, fileName } = await createDatabaseBackup();
  res.download(filePath, fileName, (err) => {
    if (err) {
      console.error('Ошибка при отправке файла бэкапа:', err);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Ошибка при отправке файла' });
      }
    }
    fs.unlink(filePath, (unlinkErr) => {
      if (unlinkErr) console.error('Не удалось удалить временный бэкап:', unlinkErr);
    });
  });
});

export const runParser = asyncHandler(async (req, res) => {
  const PARSER_SERVER_URL = process.env.PARSER_SERVER_URL;
  const mode = req.body?.mode === 'incremental' ? 'incremental' : 'full';
  const parserResponse = await axios.post(`${PARSER_SERVER_URL}/api/parser/start`, { mode });
  res.status(200).json(parserResponse.data);
});

export const stopParser = asyncHandler(async (req, res) => {
  const PARSER_SERVER_URL = process.env.PARSER_SERVER_URL;
  const parserResponse = await axios.post(`${PARSER_SERVER_URL}/api/parser/stop`);
  res.status(200).json(parserResponse.data);
});

export const getParserStatus = asyncHandler(async (req, res) => {
  const PARSER_SERVER_URL = process.env.PARSER_SERVER_URL;
  const parserResponse = await axios.get(`${PARSER_SERVER_URL}/api/parser/status`);
  res.status(200).json(parserResponse.data);
});

export const getDownloadSections = asyncHandler(async (req, res) => {
  const PARSER_SERVER_URL = process.env.PARSER_SERVER_URL;
  const parserResponse = await axios.get(`${PARSER_SERVER_URL}/api/parser/sections`);
  res.status(200).json(parserResponse.data);
});

export const downloadLibraryFiles = asyncHandler(async (req, res) => {
  const PARSER_SERVER_URL = process.env.PARSER_SERVER_URL;
  const sections = Array.isArray(req.body?.sections) ? req.body.sections : null;
  const parserResponse = await axios.post(
    `${PARSER_SERVER_URL}/api/parser/download_files`,
    { sections }
  );
  res.status(200).json(parserResponse.data);
});

export const stopLibraryDownload = asyncHandler(async (req, res) => {
  const PARSER_SERVER_URL = process.env.PARSER_SERVER_URL;
  const parserResponse = await axios.post(`${PARSER_SERVER_URL}/api/parser/download_stop`);
  res.status(200).json(parserResponse.data);
});

const CONVERTER_SERVER_URL = () => process.env.CONVERTER_SERVER_URL || 'http://127.0.0.1:8004';

const proxyToConverter = async (res, method, path, data) => {
  try {
    const response = await axios({ method, url: `${CONVERTER_SERVER_URL()}${path}`, data, timeout: 15000 });
    return res.status(200).json(response.data);
  } catch (error) {
    if (!error.response) {
      return res.status(503).json({
        message: 'Конвертер недоступен (:8004). Запустите start_all.sh или doc_converter.',
      });
    }
    return res.status(502).json({
      message: error.response.data?.message || error.response.data?.detail || `Ошибка конвертера: ${error.message}`,
    });
  }
};

export const getConverterStatus = asyncHandler(async (req, res) => {
  await proxyToConverter(res, 'get', '/api/converter/status');
});

export const startConverter = asyncHandler(async (req, res) => {
  const sections = Array.isArray(req.body?.sections) && req.body.sections.length > 0 ? req.body.sections : null;
  const force = Boolean(req.body?.force);
  await proxyToConverter(res, 'post', '/api/converter/start', { sections, force });
});

export const stopConverter = asyncHandler(async (req, res) => {
  await proxyToConverter(res, 'post', '/api/converter/stop');
});

export const handleParserWebhookLog = async (req, res, next) => {
  try {
    const { level, message, timestamp } = req.body;

    const logEntry = {
      level: level || "INFO",
      message: message,
      timestamp: timestamp || new Date().toISOString()
    };

    parserLogsCache.push(logEntry);
    if (parserLogsCache.length > 500) {
      parserLogsCache.shift();
    }

    socketServerInstance.emitParserLog(logEntry);

    return res.status(200).json({ status: 'success' });
  } catch (error) {
    next(error);
  }
};

export const getInitialLogs = (req, res) => {
  return res.status(200).json(parserLogsCache);
};

export const agentChat = asyncHandler(async (req, res) => {
  const ORCHESTRATOR_SERVER_URL = process.env.ORCHESTRATOR_SERVER_URL || 'http://127.0.0.1:8003';
  const message = (req.body?.message || '').trim();
  if (!message) {
    return res.status(400).json({ message: 'Пустое сообщение' });
  }
  try {
    const response = await axios.post(
      `${ORCHESTRATOR_SERVER_URL}/api/agent/chat`,
      { message },
      { timeout: 60000 }
    );
    return res.status(200).json(response.data);
  } catch (error) {
    const status = error.response?.status;
    const detail = error.response?.data?.message || error.response?.data?.detail;
    if (!error.response || error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(503).json({
        message: 'Оркестратор недоступен (:8003). Запустите start_all.sh или сервис agents.',
      });
    }
    return res.status(status && status >= 400 ? status : 502).json({
      message: detail || `Ошибка оркестратора: ${error.message}`,
    });
  }
});

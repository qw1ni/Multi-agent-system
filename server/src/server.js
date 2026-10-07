import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import router from './routes/allRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import cookieParser from 'cookie-parser';
import socketServerInstance from './websocket/socketServer.js';

BigInt.prototype.toJSON = function() {       
  return Number(this);
};

const port = process.env.SERVER_PORT;
const app = express()

const server = http.createServer(app);

const corsOptions = {
    origin: process.env.DOMAIN,
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cookieParser());
app.use(cors(corsOptions));
app.use(express.json());
app.use("/api", router);
app.use(errorHandler);

socketServerInstance.init(server, corsOptions);

const start = async () => {
    try {
        server.listen(port, () => console.log(`Server listening on port ${port}`));
    } catch (e) {
        console.log(e);
    }
};

start();

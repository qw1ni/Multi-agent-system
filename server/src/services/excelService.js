import ExcelJS from 'exceljs';

const getThinBorders = () => ({
  top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
  bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
  left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
  right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
});

export const generateTopAuthorsExcel = async (authorsData) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Топ авторов');
  worksheet.views = [{ showGridLines: true }];

  const headerRow = worksheet.addRow(['№', 'ФИО Автора', 'Количество материалов']);

  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF5F5F5' }
    };
    cell.font = { name: 'Arial', size: 10, bold: true };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = getThinBorders();
  });
  headerRow.height = 24;

  authorsData.forEach((author, index) => {
    const rowNumber = index + 1;
    const row = worksheet.addRow([rowNumber, author.name, author.count]);

    const isTop3 = index < 3;

    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Arial', size: 10, bold: colNumber === 2 ? isTop3 : false };
      cell.alignment = {
        vertical: 'middle',
        horizontal: colNumber === 2 ? 'left' : 'center'
      };
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
      };
    });
  });

  worksheet.getColumn(1).width = 8;
  worksheet.getColumn(2).width = 40;
  worksheet.getColumn(3).width = 25;

  return await workbook.xlsx.writeBuffer();
};

export const generateFacultyReportExcel = async (data, startYear, endYear) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Отчет по факультетам');

  const sYear = Number(startYear);
  const eYear = Number(endYear);
  const years = Array.from({ length: eYear - sYear + 1 }, (_, i) => (sYear + i).toString());

  worksheet.mergeCells(1, 1, 1, years.length + 2);
  const titleCell = worksheet.getCell('A1');
  titleCell.value = `Отчет по факультетам за период ${startYear} - ${endYear} гг.`;
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF000000' } };
  worksheet.addRow([]);

  const headerTitles = ['Наименование факультета', ...years, 'Итого'];
  const headerRow = worksheet.addRow(headerTitles);

  headerRow.eachCell((cell, colNumber) => {
    const isFirst = colNumber === 1;
    const isLast = colNumber === headerTitles.length;

    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: isLast ? 'FFE3F2FD' : 'FFF5F5F5' }
    };
    cell.font = { name: 'Arial', size: 10, bold: true };

    cell.alignment = {
      vertical: 'middle',
      horizontal: isFirst ? 'left' : 'center'
    };

    cell.border = getThinBorders();
  });
  headerRow.height = 24;

  const firstDataRowNumber = worksheet.lastRow.number + 1;

  const cleanData = data.filter(row => row.faculty_name !== "Итого");

  cleanData.forEach((row) => {
    const rowValues = [row.faculty_name];

    years.forEach(year => {
      rowValues.push(row[year] ? Number(row[year]) : 0);
    });
    rowValues.push(row.total ? Number(row.total) : 0);

    const addedRow = worksheet.addRow(rowValues);

    addedRow.eachCell((cell, colNumber) => {
      const isFirstColumn = colNumber === 1;
      const isLastColumn = colNumber === rowValues.length;

      cell.font = { name: 'Arial', size: 10, bold: isLastColumn };
      cell.alignment = { vertical: 'middle', horizontal: isFirstColumn ? 'left' : 'center' };

      if (!isFirstColumn) {
        cell.numFmt = '#,##0';
      }

      if (isLastColumn) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFEBF5FB' }
        };
      }

      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
      };
    });
    addedRow.height = 20;
  });

  const lastDataRowNumber = worksheet.lastRow.number;
  const totalRowValues = ['Итого'];

  for (let colIdx = 2; colIdx <= years.length + 2; colIdx++) {
    const columnName = worksheet.getColumn(colIdx).letter;
    totalRowValues.push({
      formula: `SUM(${columnName}${firstDataRowNumber}:${columnName}${lastDataRowNumber})`
    });
  }

  const totalRow = worksheet.addRow(totalRowValues);

  totalRow.eachCell((cell, colNumber) => {
    const isFirstColumn = colNumber === 1;
    const isLastColumn = colNumber === totalRowValues.length;

    cell.font = { name: 'Arial', size: 10, bold: true };
    cell.alignment = { vertical: 'middle', horizontal: isFirstColumn ? 'left' : 'center' };

    if (!isFirstColumn) {
      cell.numFmt = '#,##0';
    }

    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: isLastColumn ? 'FFBBDEFB' : 'FFEBF5FB' }
    };

    cell.border = {
      top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
    };
  });
  totalRow.height = 22;

  worksheet.getColumn(1).width = 45;
  for (let i = 2; i <= years.length + 2; i++) {
    worksheet.getColumn(i).width = 12;
  }

  return await workbook.xlsx.writeBuffer();
};

export const generateFacultyDepReportExcel = async (data, startYear, endYear) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('По факультетам и кафедрам');

  const sYear = Number(startYear);
  const eYear = Number(endYear);
  const years = Array.from({ length: eYear - sYear + 1 }, (_, i) => (sYear + i).toString());

  const totalColumns = 3 + years.length;
  worksheet.mergeCells(1, 1, 1, totalColumns);
  const titleCell = worksheet.getCell('A1');
  titleCell.value = `Отчет по факультетам в разрезе кафедр за период ${startYear} - ${endYear} гг.`;
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF000000' } };
  worksheet.addRow([]);

  const headerTitles = ['Факультет', 'Кафедра', ...years, 'Итого'];
  const headerRow = worksheet.addRow(headerTitles);
  headerRow.height = 24;

  headerRow.eachCell((cell, colNumber) => {
    const isLast = colNumber === headerTitles.length;
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: isLast ? 'FFE0F7FA' : 'FFEEEEEE' }
    };
    cell.font = { name: 'Arial', size: 10, bold: true };
    cell.alignment = {
      vertical: 'middle',
      horizontal: colNumber <= 2 ? 'left' : 'center'
    };
    cell.border = getThinBorders();
  });

  worksheet.facultyRows = [];

  data.forEach((faculty) => {
    const startRowIndex = worksheet.lastRow.number + 1;

    faculty.departments.forEach((dep) => {
      const rowValues = [faculty.name, dep.department_name];

      years.forEach(year => {
        rowValues.push(dep[year] ? Number(dep[year]) : 0);
      });
      rowValues.push(dep.total ? Number(dep.total) : 0);

      const addedRow = worksheet.addRow(rowValues);
      addedRow.height = 20;

      addedRow.eachCell((cell, colNumber) => {
        const isFacultyCol = colNumber === 1;
        const isDepCol = colNumber === 2;
        const isLastCol = colNumber === rowValues.length;

        cell.font = { name: 'Arial', size: 10, bold: isFacultyCol || isLastCol };
        cell.alignment = {
          vertical: isFacultyCol ? 'top' : 'middle',
          horizontal: (isFacultyCol || isDepCol) ? 'left' : 'center'
        };

        if (colNumber > 2) {
          cell.numFmt = '#,##0';
        }

        if (isFacultyCol) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFAFA' } };
        } else if (isLastCol) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF5FB' } };
        }

        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
        };
      });
    });

    const totalRowValues = ['', 'ИТОГО по факультету:'];
    years.forEach(year => {
      totalRowValues.push(faculty.totals[year] ? Number(faculty.totals[year]) : 0);
    });
    totalRowValues.push(faculty.totals.total ? Number(faculty.totals.total) : 0);

    const facultyTotalRow = worksheet.addRow(totalRowValues);
    facultyTotalRow.height = 22;

    const endRowIndex = facultyTotalRow.number;

    worksheet.facultyRows.push(endRowIndex);

    facultyTotalRow.eachCell((cell, colNumber) => {
      const isDepCol = colNumber === 2;
      const isLastCol = colNumber === totalRowValues.length;

      cell.font = { name: 'Arial', size: 10, bold: true, italic: isDepCol };
      cell.alignment = { vertical: 'middle', horizontal: colNumber <= 2 ? 'left' : 'center' };

      if (colNumber > 2) {
        cell.numFmt = '#,##0';
      }

      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isLastCol ? 'FFB2EBF2' : 'FFE1F5FE' }
      };

      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFB0BEC5' } },
        left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
      };
    });

    worksheet.mergeCells(startRowIndex, 1, endRowIndex, 1);
  });

  const globalTotalRowValues = ['ИТОГО:', ''];

  for (let colIdx = 3; colIdx <= totalColumns; colIdx++) {
    const columnName = worksheet.getColumn(colIdx).letter;
    const cellsToSum = worksheet.facultyRows.map(rowPos => `${columnName}${rowPos}`).join(',');
    globalTotalRowValues.push({
      formula: `SUM(${cellsToSum})`
    });
  }

  const globalTotalRow = worksheet.addRow(globalTotalRowValues);
  globalTotalRow.height = 24;

  const globalTotalRowNumber = globalTotalRow.number;
  worksheet.mergeCells(globalTotalRowNumber, 1, globalTotalRowNumber, 2);

  globalTotalRow.eachCell((cell, colNumber) => {
    const isLastCol = colNumber === globalTotalRowValues.length;

    cell.font = { name: 'Arial', size: 10, bold: true };
    cell.alignment = { vertical: 'middle', horizontal: colNumber <= 2 ? 'left' : 'center' };

    if (colNumber > 2) {
      cell.numFmt = '#,##0';
    }

    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: isLastCol ? 'FF80DEEA' : 'FFE1F5FE' }
    };

    cell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
    };
  });

  worksheet.getColumn(1).width = 35;
  worksheet.getColumn(2).width = 45;
  for (let i = 3; i <= totalColumns; i++) {
    worksheet.getColumn(i).width = 12;
  }

  return await workbook.xlsx.writeBuffer();
};

export const generateAuthorReportExcel = async (data, authorName, startYear, endYear) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Отчет по автору');

  const report = data?.report ? data.report : (data && typeof data === 'object' && !Array.isArray(data) ? data : {});
  const years = Object.keys(report).sort((a, b) => b - a);

  worksheet.mergeCells(1, 1, 1, 3);
  const titleCell = worksheet.getCell('A1');
  titleCell.value = `Список материалов автора: ${authorName || 'Не указан'} за период ${startYear} - ${endYear} гг.`;
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF000000' } };
  worksheet.addRow([]);

  const headerTitles = ['Год', '№', 'Информация о материале'];
  const headerRow = worksheet.addRow(headerTitles);
  headerRow.height = 24;

  headerRow.eachCell((cell, colNumber) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEEEE' } };
    cell.font = { name: 'Arial', size: 10, bold: true };
    cell.alignment = {
      vertical: 'middle',
      horizontal: colNumber === 3 ? 'left' : 'center'
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    };
  });

  const mergeRanges = [];

  years.forEach((year) => {
    const items = report[year] || [];
    const startRowIndex = worksheet.lastRow.number + 1;

    items.forEach((item, index) => {
      const biblioText = `${item.authors || ''} (${item.publisher || ''}, ${year})`;

      const addedRow = worksheet.addRow([Number(year), item.number ? Number(item.number) : (index + 1), '']);
      addedRow.height = 45;

      const currentRowNumber = addedRow.number;
      const cellYear = worksheet.getCell(`A${currentRowNumber}`);
      const cellNum = worksheet.getCell(`B${currentRowNumber}`);
      const cellInfo = worksheet.getCell(`C${currentRowNumber}`);

      cellInfo.value = {
        hyperlink: item.uri || '',
        tooltip: item.uri || '',
        text: {
          richText: [
            {
              text: `${item.title}\n`,
              font: { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1976D2' }, underline: 'single' }
            },
            {
              text: biblioText,
              font: { name: 'Arial', size: 9, bold: false, color: { argb: 'FF555555' }, underline: false }
            }
          ]
        }
      };

      cellYear.alignment = { vertical: 'top', horizontal: 'center', margin: { top: 6 } };
      cellNum.alignment = { vertical: 'top', horizontal: 'center', margin: { top: 6 } };
      cellInfo.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

      cellYear.numFmt = '0000';
      cellNum.numFmt = '#,##0';
    });

    const endRowIndex = worksheet.lastRow.number;

    if (items.length > 0) {
      mergeRanges.push({ start: startRowIndex, end: endRowIndex });
    }
  });

  // Создание границ до слияния 
  const finalTableLastRow = worksheet.lastRow.number;
  for (let r = 3; r <= finalTableLastRow; r++) {
    for (let c = 1; c <= 3; c++) {
      const cell = worksheet.getCell(r, c);
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
    }
  }

  // Слияние колонки "Год"
  mergeRanges.forEach(range => {
    worksheet.mergeCells(range.start, 1, range.end, 1);

    for (let row = range.start; row <= range.end; row++) {
      const cellA = worksheet.getCell(`A${row}`);
      const cellB = worksheet.getCell(`B${row}`);

      cellA.border = {
        ...cellA.border,
        right: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } }
      };
      cellB.border = {
        ...cellB.border,
        left: { style: 'thin', color: { argb: 'FF000000' } }
      };
    }
  });

  worksheet.getColumn(1).width = 12;
  worksheet.getColumn(2).width = 8;
  worksheet.getColumn(3).width = 95;

  return await workbook.xlsx.writeBuffer();
};

export const generateDepartmentMaterialsExcel = async (data, departmentName) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Материалы кафедры');

  worksheet.mergeCells(1, 1, 1, 6);
  const titleCell = worksheet.getCell('A1');
  titleCell.value = `${departmentName || 'Не указана'}`;
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF000000' } };
  worksheet.addRow([]);

  const headerTitles = [
    '№',
    'Наименование методических рекомендаций (библиография)',
    'Составитель(и)',
    'Тип',
    'Год издания',
    'Ссылка на ресурс'
  ];
  const headerRow = worksheet.addRow(headerTitles);
  headerRow.height = 26;

  headerRow.eachCell((cell, colNumber) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEEEE' } };
    cell.font = { name: 'Arial', size: 10, bold: true };
    cell.alignment = {
      vertical: 'middle',
      horizontal: (colNumber === 2 || colNumber === 3) ? 'left' : 'center',
      wrapText: true
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    };
  });

  const targetData = data || {};
  const entries = Object.entries(targetData);

  entries.forEach(([year, materials]) => {
    if (!Array.isArray(materials) || materials.length === 0) return;

    const yearRow = worksheet.addRow(['', '']);
    yearRow.height = 22;
    const yearRowNumber = yearRow.number;

    worksheet.mergeCells(yearRowNumber, 2, yearRowNumber, 6);
    const cellYearIndicator = worksheet.getCell(`B${yearRowNumber}`);
    cellYearIndicator.value = year === 'Год не указан' ? year : `${year} год`;

    for (let col = 1; col <= 6; col++) {
      const cell = worksheet.getCell(yearRowNumber, col);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFAFA' } };
      cell.font = { name: 'Arial', size: 10, bold: true, italic: true };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
    }

    materials.forEach((row) => {
      const addedRow = worksheet.addRow(['', '', '', '', '', '']);
      addedRow.height = 70;

      const currentRowNum = addedRow.number;

      const cellNum = worksheet.getCell(`A${currentRowNum}`);
      const cellCitation = worksheet.getCell(`B${currentRowNum}`);
      const cellAuthors = worksheet.getCell(`C${currentRowNum}`);
      const cellTypes = worksheet.getCell(`D${currentRowNum}`);
      const cellYearVal = worksheet.getCell(`E${currentRowNum}`);
      const cellLink = worksheet.getCell(`F${currentRowNum}`);

      cellNum.value = row.number ? Number(row.number) : '';
      cellCitation.value = row.citation || 'Библиографическое описание отсутствует';
      cellAuthors.value = row.authors || '';
      cellTypes.value = row.types || 'Методические указания';
      cellYearVal.value = year === 'Год не указан' ? year : Number(year);

      if (row.file_link) {
        cellLink.value = {
          text: 'Ссылка на ресурс',
          hyperlink: row.file_link,
          tooltip: 'Открыть электронный ресурс'
        };
        cellLink.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1976D2' }, underline: 'single' };
      } else {
        cellLink.value = '—';
        cellLink.font = { name: 'Arial', size: 10, color: { argb: 'FF999999' } };
      }

      cellCitation.font = { name: 'Arial', size: 10 };
      cellAuthors.font = { name: 'Arial', size: 10 };
      cellTypes.font = { name: 'Arial', size: 10 };

      cellNum.alignment = { vertical: 'middle', horizontal: 'center' };
      cellCitation.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      cellAuthors.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      cellTypes.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cellYearVal.alignment = { vertical: 'middle', horizontal: 'center' };
      cellLink.alignment = { vertical: 'middle', horizontal: 'center' };

      if (typeof cellYearVal.value === 'number') cellYearVal.numFmt = '0000';
      if (typeof cellNum.value === 'number') cellNum.numFmt = '#,##0';

      [cellNum, cellCitation, cellAuthors, cellTypes, cellYearVal, cellLink].forEach(cell => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });
    });
  });

  worksheet.getColumn(1).width = 7;
  worksheet.getColumn(2).width = 65;
  worksheet.getColumn(3).width = 25;
  worksheet.getColumn(4).width = 22;
  worksheet.getColumn(5).width = 14;
  worksheet.getColumn(6).width = 20;

  return await workbook.xlsx.writeBuffer();
};

export const generateSpecialtyDisciplinesWithMaterialsReport = async (reportData, startYear, endYear) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Отчет по дисциплинам');

  worksheet.columns = [
    { key: 'discipline', width: 35 },
    { key: 'materials', width: 65 },
    { key: 'uri', width: 45 },
    { key: 'pdf', width: 30 }
  ];

  worksheet.mergeCells('A1:D1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = `Материалы по специальности "${reportData.specCode} — ${reportData.specName}" за период ${startYear} - ${endYear} гг.`;
  titleCell.font = { name: 'Arial', size: 13, bold: true };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
  worksheet.getRow(1).height = 35;

  const headers = [
    'Наименование предмета',
    'Методические рекомендации',
    'Ссылка в электронной библиотеке',
    'Ссылка на файл (PDF)'
  ];

  const headerRow = worksheet.getRow(3);
  headerRow.height = 28;

  headers.forEach((headerText, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = headerText;
    cell.font = { name: 'Arial', size: 10, bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = getThinBorders();
  });

  let currentExcelRow = 4;

  for (const rowData of reportData.rows) {
    const hasMaterials = rowData.materials && rowData.materials.length > 0;
    const materialsCount = hasMaterials ? rowData.materials.length : 1;
    const startRow = currentExcelRow;
    const endRow = currentExcelRow + materialsCount - 1;

    if (hasMaterials) {
      rowData.materials.forEach((material, index) => {
        const row = worksheet.getRow(startRow + index);

        row.getCell(1).value = rowData.disciplineName;

        const infoCell = row.getCell(2);
        const richTextValue = [];

        if (material.title) {
          richTextValue.push({ text: material.title + '\n', font: { name: 'Arial', size: 10, bold: true } });
        }
        if (material.authors) {
          richTextValue.push({ text: material.authors + '\n', font: { name: 'Arial', size: 10, italic: true } });
        }
        const descriptionText = material.alternativeTitle
          ? `${material.alternativeTitle}, ${material.issuedYear}`
          : `${material.issuedYear}`;
        richTextValue.push({ text: descriptionText, font: { name: 'Arial', size: 10 } });

        infoCell.value = { richText: richTextValue };
        infoCell.alignment = { wrapText: true, vertical: 'top', horizontal: 'left' };

        const uriCell = row.getCell(3);
        if (material.uri) {
          uriCell.value = { text: material.uri, hyperlink: material.uri };
          uriCell.font = { name: 'Arial', size: 10, color: { argb: 'FF0066CC' }, underline: true };
        } else {
          uriCell.value = '—';
        }
        uriCell.alignment = { wrapText: true, vertical: 'top', horizontal: 'left' };

        const pdfCell = row.getCell(4);
        if (material.fileLink) {
          pdfCell.value = { text: 'Ссылка на материал (PDF)', hyperlink: material.fileLink };
          pdfCell.font = { name: 'Arial', size: 10, color: { argb: 'FF0066CC' }, underline: true };
        } else {
          pdfCell.value = '—';
        }
        pdfCell.alignment = { vertical: 'top', horizontal: 'center', wrapText: true };
      });
    } else {
      const row = worksheet.getRow(startRow);
      row.getCell(1).value = rowData.disciplineName;

      for (let c = 2; c <= 4; c++) {
        const cell = row.getCell(c);
        cell.value = '—';
        cell.alignment = { vertical: 'top', horizontal: 'center' };
        cell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF888888' } };
      }
    }

    if (materialsCount > 1) {
      worksheet.mergeCells(`A${startRow}:A${endRow}`);
    }

    for (let r = startRow; r <= endRow; r++) {
      const row = worksheet.getRow(r);
      const disciplineCell = row.getCell(1);

      disciplineCell.alignment = { wrapText: true, vertical: 'top', horizontal: 'left' };
      disciplineCell.font = { name: 'Arial', size: 10, bold: true };
      disciplineCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF9F9F9' }
      };

      for (let c = 1; c <= 4; c++) {
        row.getCell(c).border = getThinBorders();
      }
    }

    currentExcelRow = endRow + 1;
  }

  return await workbook.xlsx.writeBuffer();
};

export const generateSpecialtyMaterialsExcelReport = async (reportData, startYear, endYear) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Отчет по материалам');

  // Принудительно включаем отображение стандартной сетки Excel
  worksheet.views = [{ showGridLines: true }];

  // Настройка базовой ширины колонок (№ п/п, Материал, Год, URI, PDF)
  worksheet.columns = [
    { key: 'index', width: 8 },
    { key: 'materialInfo', width: 70 },
    { key: 'year', width: 15 },
    { key: 'uri', width: 45 },
    { key: 'pdf', width: 30 }
  ];

  // --- 1. Название отчета (Строка 1) ---
  worksheet.mergeCells('A1:E1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = `Материалы по специальности: ${reportData.specCode} — ${reportData.specName} за период ${startYear} - ${endYear} гг.`;
  titleCell.font = { name: 'Arial', size: 13, bold: true };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
  worksheet.getRow(1).height = 35;


  // --- 2. Названия колонок (Строка 3) ---
  const headers = [
    '№ п/п',
    'Наименование учебно-методического материала / Авторы',
    'Год издания',
    'Ссылка в электронной библиотеке',
    'Ссылка на файл (PDF)'
  ];

  const headerRow = worksheet.getRow(3);
  headerRow.height = 30;

  headers.forEach((headerText, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = headerText;
    cell.font = { name: 'Arial', size: 10, bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = getThinBorders();
  });

  let currentExcelRow = 4;

  reportData.materials.forEach((material, index) => {
    const row = worksheet.getRow(currentExcelRow);
    row.height = 100;

    const indexCell = row.getCell(1);
    indexCell.value = index + 1;
    indexCell.alignment = { vertical: 'top', horizontal: 'center' };

    const infoCell = row.getCell(2);
    const richTextValue = [];

    if (material.title) {
      richTextValue.push({
        text: material.title + '\n',
        font: { name: 'Arial', size: 10, bold: true }
      });
    }

    if (material.citation) {
      richTextValue.push({
        text: `${material.alternativeTitle}\n`,
        font: { name: 'Arial', size: 9, color: { argb: 'FF555555' } }
      });
    }

    if (material.authors) {
      richTextValue.push({
        text: `Авторы: ${material.authors}`,
        font: { name: 'Arial', size: 10, italic: true, color: { argb: 'FF1976D2' } } // Выделяем авторов синеватым оттенком, как в MUI
      });
    }

    infoCell.value = { richText: richTextValue };
    infoCell.alignment = { wrapText: true, vertical: 'top', horizontal: 'left' };

    const yearCell = row.getCell(3);
    let yearText = `${material.issuedYear}`;
    yearCell.value = yearText;
    yearCell.alignment = { wrapText: true, vertical: 'top', horizontal: 'center' };
    yearCell.font = { name: 'Arial', size: 10 };

    const uriCell = row.getCell(4);
    if (material.uri) {
      uriCell.value = { text: material.uri, hyperlink: material.uri };
      uriCell.font = { name: 'Arial', size: 10, color: { argb: 'FF0066CC' }, underline: true };
    } else {
      uriCell.value = '—';
    }
    uriCell.alignment = { wrapText: true, vertical: 'top', horizontal: 'left' };

    const pdfCell = row.getCell(5);
    if (material.fileLink) {
      pdfCell.value = { text: 'Ссылка на материал (PDF)', hyperlink: material.fileLink };
      pdfCell.font = { name: 'Arial', size: 10, color: { argb: 'FFD32F2F' }, underline: true }; // Красный оттенок для PDF
    } else {
      pdfCell.value = '—';
    }
    pdfCell.alignment = { vertical: 'top', horizontal: 'center', wrapText: true };

    // Применяем сетку черных границ ко всем ячейкам строки
    for (let c = 1; c <= 5; c++) {
      row.getCell(c).border = getThinBorders();
    }

    currentExcelRow++;
  });

  return await workbook.xlsx.writeBuffer();
};

export const generateDepartmentDisciplinesExcelReport = async (
  reportData,
  startYear,
  endYear,
  targetYear,
  showReissueColumn = false
) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(
    showReissueColumn ? 'Потребность в переиздании' : 'По дисциплинам кафедры'
  );

  worksheet.views = [{ showGridLines: true }];

  // ✅ Смещение колонок при наличии колонки переиздания
  const colOffset = showReissueColumn ? 1 : 0;
  const totalColumns = 5 + colOffset;

  // ✅ Динамические колонки
  const columns = [
    { key: 'disciplineName', width: 30 },
    ...(showReissueColumn ? [{ key: 'reissue', width: 18 }] : []),
    { key: 'bibliography', width: 65 },
    { key: 'yearStartBound', width: 20 },
    { key: 'uri', width: 40 },
    { key: 'pdf', width: 30 }
  ];
  worksheet.columns = columns;

  // ✅ Динамический заголовок
  const lastColLetter = worksheet.getColumn(totalColumns).letter;
  worksheet.mergeCells(`A1:${lastColLetter}1`);

  const titleCell = worksheet.getCell('A1');
  titleCell.value = showReissueColumn
    ? `${reportData.departmentName || ''}. Потребность в переиздании материалов за период ${startYear} - ${endYear} гг. на ${targetYear} год`
    : `${reportData.departmentName || ''}. Отчет по дисциплинам за период ${startYear} - ${endYear} гг.`;
  titleCell.font = { name: 'Arial', size: 13, bold: true };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
  worksheet.getRow(1).height = 35;

  // ✅ Динамическая шапка
  const headers = [
    'Дисциплина',
    ...(showReissueColumn ? ['Требуется переиздание'] : []),
    'Библиография',
    'Год начала подготовки',
    'Ссылка в электронной библиотеке',
    'Ссылка на файл (PDF)'
  ];

  const headerRow = worksheet.getRow(3);
  headerRow.height = 30;

  headers.forEach((headerText, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = headerText;
    cell.font = { name: 'Arial', size: 10, bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = getThinBorders();
  });

  let currentExcelRow = 4;
  const rows = reportData?.rows || [];

  rows.forEach((rowGroup) => {
    const hasMaterials = rowGroup.materials && rowGroup.materials.length > 0;
    const totalRowsForDiscipline = hasMaterials ? rowGroup.materials.length : 1;

    const startRow = currentExcelRow;
    const endRow = startRow + totalRowsForDiscipline - 1;

    if (hasMaterials) {
      rowGroup.materials.forEach((material, mIndex) => {
        const row = worksheet.getRow(currentExcelRow);
        row.height = 90;

        if (mIndex === 0) {
          const disciplineCell = row.getCell(1);
          disciplineCell.value = rowGroup.disciplineName;
          disciplineCell.font = { name: 'Arial', size: 10, bold: true };
          disciplineCell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
        }

        if (showReissueColumn) {
          const reissueCell = row.getCell(2);
          reissueCell.value = material.needsReissue ? 'Да' : 'Нет';
          reissueCell.font = {
            name: 'Arial',
            size: 10,
            bold: material.needsReissue,
            color: material.needsReissue
              ? { argb: 'FFD32F2F' }
              : { argb: 'FF2E7D32' }
          };
          if (material.needsReissue) {
            reissueCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFF2F2' }
            };
          }
          reissueCell.alignment = { vertical: 'middle', horizontal: 'center' };
        }

        const bibCell = row.getCell(2 + colOffset);
        const richTextValue = [];

        if (material.title) {
          richTextValue.push({
            text: material.title + '\n',
            font: { name: 'Arial', size: 10, bold: true }
          });
        }

        if (material.citation) {
          richTextValue.push({
            text: `${material.citation}\n`,
            font: { name: 'Arial', size: 9, color: { argb: 'FF555555' } }
          });
        }

        bibCell.value = { richText: richTextValue };
        bibCell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };

        const yearCell = row.getCell(3 + colOffset);
        yearCell.value = rowGroup.yearStartBound;
        yearCell.font = { name: 'Arial', size: 10 };
        yearCell.alignment = { vertical: 'top', horizontal: 'center', wrapText: true };

        const uriCell = row.getCell(4 + colOffset);
        if (material.uri) {
          uriCell.value = { text: material.uri, hyperlink: material.uri };
          uriCell.font = { name: 'Arial', size: 10, color: { argb: 'FF0066CC' }, underline: true };
        } else {
          uriCell.value = '—';
        }
        uriCell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };

        const pdfCell = row.getCell(5 + colOffset);
        if (material.fileLink) {
          pdfCell.value = { text: material.fileLink, hyperlink: material.fileLink };
          pdfCell.font = { name: 'Arial', size: 10, color: { argb: 'FFD32F2F' }, underline: true };
        } else {
          pdfCell.value = '—';
        }
        pdfCell.alignment = { vertical: 'top', horizontal: 'center', wrapText: true };

        for (let c = 1; c <= totalColumns; c++) {
          row.getCell(c).border = getThinBorders();
        }

        currentExcelRow++;
      });
    } else {
      const row = worksheet.getRow(currentExcelRow);
      row.height = 40;

      const disciplineCell = row.getCell(1);
      disciplineCell.value = rowGroup.disciplineName;
      disciplineCell.font = { name: 'Arial', size: 10, bold: true };
      disciplineCell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };

      if (showReissueColumn) {
        row.getCell(2).value = '—';
        row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
      }

      const bibCell = row.getCell(2 + colOffset);
      bibCell.value = 'Учебно-методические материалы по данной дисциплине не найдены';
      bibCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF757575' } };
      bibCell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };

      const yearCell = row.getCell(3 + colOffset);
      yearCell.value = rowGroup.yearStartBound;
      yearCell.font = { name: 'Arial', size: 10 };
      yearCell.alignment = { vertical: 'top', horizontal: 'center', wrapText: true };

      row.getCell(4 + colOffset).value = '—';
      row.getCell(4 + colOffset).alignment = { vertical: 'top', horizontal: 'center' };

      row.getCell(5 + colOffset).value = '—';
      row.getCell(5 + colOffset).alignment = { vertical: 'top', horizontal: 'center' };

      for (let c = 1; c <= totalColumns; c++) {
        row.getCell(c).border = getThinBorders();
      }

      currentExcelRow++;
    }

    if (totalRowsForDiscipline > 1) {
      const yearColLetter = worksheet.getColumn(3 + colOffset).letter;

      worksheet.mergeCells(`A${startRow}:A${endRow}`);
      worksheet.mergeCells(`${yearColLetter}${startRow}:${yearColLetter}${endRow}`);

      worksheet.getCell(`A${startRow}`).alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
      worksheet.getCell(`${yearColLetter}${startRow}`).alignment = { vertical: 'top', horizontal: 'center', wrapText: true };
    }
  });

  return await workbook.xlsx.writeBuffer();
};
import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    Table,
    TableRow,
    TableCell,
    BorderStyle,
    WidthType,
    VerticalAlign,
    AlignmentType,
    ExternalHyperlink
} from 'docx';

const generateBaseWordTable = async ({
    title,
    headers,
    rows,
}) => {

    const tableRows = [];

    tableRows.push(
        new TableRow({
            tableHeader: true,
            children: headers.map(header =>
                new TableCell({
                    children: [
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                                new TextRun({ text: header, bold: true, size: 22 })
                            ]
                        })
                    ]
                })
            )
        })
    );

    rows.forEach(row => {
        tableRows.push(
            new TableRow({
                children: row.map(cell => {

                    const cellData = typeof cell === "object"
                        ? cell
                        : { text: cell };

                    return new TableCell({
                        rowSpan: cellData.rowSpan,
                        shading: cellData.shading,
                        verticalAlign: cellData.verticalAlign ?? VerticalAlign.CENTER,
                        children: [
                            new Paragraph({
                                alignment: cellData.alignment ?? AlignmentType.LEFT,
                                children: cellData.richContent
                                    ? cellData.richContent
                                    : [
                                        new TextRun({
                                            text: String(cellData.text ?? ""),
                                            bold: cellData.bold
                                        })
                                    ]
                            })
                        ]
                    });
                })
            })
        );
    });

    const doc = new Document({
        sections: [{
            children: [
                new Paragraph({
                    spacing: { bottom: 300 },
                    children: [
                        new TextRun({
                            text: title,
                            bold: true,
                            size: 28
                        })
                    ]
                }),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: tableRows
                })
            ]
        }]
    });

    return await Packer.toBuffer(doc);
};

export const generateFacultyReportWord = async (reportData, startYear, endYear) => {

    const years = [];
    for (let y = Number(startYear); y <= Number(endYear); y++) {
        years.push(String(y));
    }

    const headers = [
        "Наименование факультета",
        ...years,
        "Итого"
    ];

    const rows = reportData.map(row => [
        row.faculty_name,
        ...years.map(year => row[year] || 0),
        row.total
    ]);

    return await generateBaseWordTable({
        title: `Отчет по факультетам за период ${startYear}-${endYear} гг.`,
        headers,
        rows,
        highlightLastColumn: true,
        highlightLastRow: true
    });
};

export const generateFacultyWithDepartmentsWord = async (reportData, startYear, endYear) => {

    const years = [];
    for (let y = Number(startYear); y <= Number(endYear); y++) {
        years.push(String(y));
    }

    const headers = [
        "Факультет",
        "Кафедра",
        ...years,
        "Итого"
    ];

    const rows = [];

    reportData.forEach(faculty => {

        const rowSpan = faculty.departments.length + 1;

        faculty.departments.forEach((dep, index) => {

            const row = [];

            if (index === 0) {
                row.push({
                    text: faculty.name,
                    bold: true,
                    rowSpan: rowSpan,
                    verticalAlign: VerticalAlign.TOP,
                    alignment: AlignmentType.LEFT,
                    shading: { fill: "FAFAFA" }
                });
            }

            row.push(dep.department_name);

            years.forEach(year => {
                row.push({
                    text: dep[year] || 0,
                    alignment: AlignmentType.CENTER
                });
            });

            row.push({
                text: dep.total,
                bold: true,
                shading: { fill: "F2F2F2" },
                alignment: AlignmentType.CENTER
            });

            rows.push(row);
        });

        const totalRow = [];

        totalRow.push({
            text: "ИТОГО по факультету:",
            bold: true,
            shading: { fill: "F5F5F5" }
        });

        years.forEach(year => {
            totalRow.push({
                text: faculty.totals[year] || 0,
                bold: true,
                shading: { fill: "F5F5F5" },
                alignment: AlignmentType.CENTER
            });
        });

        totalRow.push({
            text: faculty.totals.total,
            bold: true,
            shading: { fill: "ABABAB" },
            alignment: AlignmentType.CENTER
        });

        rows.push(totalRow);
    });

    return await generateBaseWordTable({
        title: `Отчет по факультетам в разрезе кафедр за период ${startYear}-${endYear} гг.`,
        headers,
        rows
    });
};

export const generateTopAuthorsWord = async (authors, limit) => {

    const headers = [
        "№",
        "ФИО автора",
        "Количество материалов"
    ];

    const rows = authors.map((author, index) => [
        {
            text: index + 1,
            alignment: AlignmentType.CENTER
        },
        {
            text: author.name,
            bold: index < 3,
            alignment: AlignmentType.CENTER
        },
        {
            text: author.count,
            alignment: AlignmentType.CENTER
        }
    ]);

    return await generateBaseWordTable({
        title: `Топ ${limit || authors.length} авторов по количеству работ (за все время)`,
        headers,
        rows
    });
};

export const generateAuthorReportWord = async (reportData, authorName, startYear, endYear) => {

    const headers = ["Год", "№", "Информация о МУ"];
    const rows = [];

    const years = Object.keys(reportData).sort((a, b) => Number(b) - Number(a));
    console.log(years);

    years.forEach(year => {
        const items = reportData[year] || [];

        items.forEach((item, index) => {
            const row = [];

            if (index === 0) {
                row.push({
                    text: year,
                    bold: true,
                    alignment: AlignmentType.CENTER,
                    verticalAlign: VerticalAlign.TOP,
                    rowSpan: items.length,
                });
            }

            row.push({
                text: item.number,
                alignment: AlignmentType.CENTER,
            });

            row.push({
                richContent: [
                    new TextRun({ text: item.title, bold: true }),
                    new TextRun({ break: 1 }),

                    new TextRun({
                        text: `${item.authors} (${item.publisher}, ${year})`,
                    }),
                    new TextRun({ break: 1 }),

                    new ExternalHyperlink({
                        link: item.uri,
                        children: [
                            new TextRun({
                                text: item.uri,
                                style: "Hyperlink"
                            })
                        ]
                    })
                ]
            });

            rows.push(row);
        });
    });

    return await generateBaseWordTable({
        title: `Отчет по автору: ${authorName} за период ${startYear}-${endYear} гг.`,
        headers,
        rows,
    });
};

export const generateDepartmentMaterialsWord = async (groupedData, departmentName, yearFrom, yearTo) => {

    const headers = [
        "№",
        "Наименование методических рекомендаций (библиография)",
        "Составитель(и)",
        "Год издания"
    ];

    const rows = [];

    Object.entries(groupedData).forEach(([year, materials]) => {
        rows.push([
            { text: "" },
            {
                text: year === "Год не указан" ? year : `${year} год`,
                bold: true,
                shading: { fill: "F5F5F5" },
                alignment: AlignmentType.LEFT
            },
            { text: "" },
            { text: "" }
        ]);

        materials.forEach(item => {

            const richContent = [
                new TextRun({ text: item.citation || "Библиографическое описание отсутствует" }),
            ];

            if (item.file_link) {
                richContent.push(new TextRun({ break: 1 }));

                richContent.push(
                    new ExternalHyperlink({
                        link: item.file_link,
                        children: [
                            new TextRun({
                                text: "Ссылка на ресурс",
                                style: "Hyperlink"
                            })
                        ]
                    })
                );
            }

            rows.push([
                {
                    text: item.number,
                    alignment: AlignmentType.CENTER
                },
                {
                    richContent,
                    alignment: AlignmentType.LEFT
                },
                {
                    text: item.authors,
                    alignment: AlignmentType.LEFT
                },
                {
                    text: year,
                    alignment: AlignmentType.CENTER
                }
            ]);
        });
    });

    return await generateBaseWordTable({
        title: `${departmentName}. Материалы за период ${yearFrom || "—"}-${yearTo || "—"} гг.`,
        headers,
        rows
    });
};

export const generateSpecialtyMaterialsWord = async (reportData, startYear, endYear) => {

    const headers = [
        "№ п/п",
        "Наименование учебно-методического материала / Авторы",
        "Год издания",
        "Ссылки"
    ];

    const rows = reportData.materials.map((material, index) => {

        const infoContent = [
            new TextRun({ text: material.title, bold: true }),
        ];

        if (material.citation) {
            infoContent.push(new TextRun({ break: 1 }));
            infoContent.push(new TextRun({
                text: material.citation,
                italics: true
            }));
        }

        infoContent.push(new TextRun({ break: 1 }));
        infoContent.push(new TextRun({
            text: `Авторы: ${material.authors}`,
        }));

        const linksContent = [];

        if (material.uri) {
            linksContent.push(
                new ExternalHyperlink({
                    link: material.uri,
                    children: [
                        new TextRun({
                            text: "В электронную библиотеку",
                            style: "Hyperlink"
                        })
                    ]
                })
            );
        }

        if (material.uri && material.fileLink) {
            linksContent.push(new TextRun({ text: " / " }));
        }

        if (material.fileLink) {
            linksContent.push(
                new ExternalHyperlink({
                    link: material.fileLink,
                    children: [
                        new TextRun({
                            text: "PDF",
                            style: "Hyperlink"
                        })
                    ]
                })
            );
        }

        return [
            {
                text: index + 1,
                alignment: AlignmentType.CENTER
            },
            {
                richContent: infoContent,
                alignment: AlignmentType.LEFT
            },
            {
                text: material.issuedYear,
                alignment: AlignmentType.CENTER
            },
            {
                richContent: linksContent,
                alignment: AlignmentType.CENTER
            }
        ];
    });

    return await generateBaseWordTable({
        title: `Материалы специальности ${reportData.specCode} — ${reportData.specName} за период ${startYear}-${endYear} гг.`,
        headers,
        rows
    });
};

export const generateSpecialtyDisciplinesWithMaterialsWord = async (
    reportData,
    startYear,
    endYear
) => {

    const headers = [
        "Наименование предмета",
        "Методические рекомендации",
        "Ссылки"
    ];

    const rows = [];

    reportData.rows.forEach(disc => {

        const hasMaterials = disc.materials && disc.materials.length > 0;
        const rowSpanCount = hasMaterials ? disc.materials.length : 1;

        if (!hasMaterials) {
            rows.push([
                {
                    text: disc.disciplineName,
                    bold: true,
                    verticalAlign: VerticalAlign.TOP,
                    shading: { fill: "FAFAFA" }
                },
                {
                    text: "—",
                    alignment: AlignmentType.CENTER
                },
                {
                    text: "—",
                    alignment: AlignmentType.CENTER
                }
            ]);
            return;
        }

        disc.materials.forEach((material, index) => {

            const row = [];

            if (index === 0) {
                row.push({
                    text: disc.disciplineName,
                    bold: true,
                    rowSpan: rowSpanCount,
                    verticalAlign: VerticalAlign.TOP,
                    shading: { fill: "FAFAFA" }
                });
            }

            const infoContent = [
                new TextRun({ text: material.title, bold: true }),
                new TextRun({ break: 1 }),
                new TextRun({ text: material.authors, italics: true }),
            ];

            if (material.alternativeTitle) {
                infoContent.push(new TextRun({ break: 1 }));
                infoContent.push(new TextRun({
                    text: `${material.alternativeTitle}, ${material.issuedYear}`,
                    color: "555555"
                }));
            }

            row.push({
                richContent: infoContent,
                alignment: AlignmentType.LEFT,
                verticalAlign: VerticalAlign.TOP
            });
            const linksContent = [];

            if (material.uri) {
                linksContent.push(
                    new ExternalHyperlink({
                        link: material.uri,
                        children: [
                            new TextRun({
                                text: "В электронную библиотеку",
                                style: "Hyperlink"
                            })
                        ]
                    })
                );
            }

            if (material.uri && material.fileLink) {
                linksContent.push(new TextRun({ text: " / " }));
            }

            if (material.fileLink) {
                linksContent.push(
                    new ExternalHyperlink({
                        link: material.fileLink,
                        children: [
                            new TextRun({
                                text: "PDF",
                                style: "Hyperlink"
                            })
                        ]
                    })
                );
            }

            if (linksContent.length === 0) {
                linksContent.push(new TextRun({ text: "—" }));
            }

            row.push({
                richContent: linksContent,
                alignment: AlignmentType.CENTER,
                verticalAlign: VerticalAlign.TOP
            });

            rows.push(row);
        });
    });

    return await generateBaseWordTable({
        title: `Дисциплины специальности ${reportData.specCode} — ${reportData.specName} за период ${startYear}-${endYear} гг.`,
        headers,
        rows
    });
};

export const generateDepartmentDisciplinesWord = async (reportData, startYear, endYear, showReissueColumn = false, targetYear) => {

    const headers = [
        "Дисциплина",
        ...(showReissueColumn ? ["Требуется переиздание"] : []),
        "Библиография",
        "Год издания",
        "Ссылки"
    ];

    const rows = [];

    reportData.rows.forEach(discipline => {

        const hasMaterials = discipline.materials?.length > 0;
        const rowSpanCount = hasMaterials ? discipline.materials.length : 1;

        if (!hasMaterials) {
            rows.push([
                {
                    text: discipline.disciplineName,
                    bold: true,
                    verticalAlign: VerticalAlign.TOP,
                    shading: { fill: "FAFAFA" }
                },
                ...(showReissueColumn ? [{ text: "—", alignment: AlignmentType.CENTER }] : []),
                { text: "Материалы отсутствуют", italics: true },
                { text: "—", alignment: AlignmentType.CENTER },
                { text: "—", alignment: AlignmentType.CENTER }
            ]);
            return;
        }

        discipline.materials.forEach((material, index) => {

            const row = [];

            if (index === 0) {
                row.push({
                    text: discipline.disciplineName,
                    bold: true,
                    rowSpan: rowSpanCount,
                    verticalAlign: VerticalAlign.TOP,
                    shading: { fill: "FAFAFA" }
                });
            }

            if (showReissueColumn) {
                row.push({
                    text: material.needsReissue ? "Да" : "Нет",
                    bold: material.needsReissue,
                    shading: material.needsReissue ? { fill: "FFF2F2" } : undefined,
                    alignment: AlignmentType.CENTER
                });
            }

            const bibliographyContent = [
                new TextRun({ text: material.title, bold: true }),
                new TextRun({ break: 1 }),
                new TextRun({ text: material.citation || "", italics: true })
            ];

            row.push({
                richContent: bibliographyContent,
                verticalAlign: VerticalAlign.TOP
            });

            row.push({
                text: material.issuedYear,
                alignment: AlignmentType.CENTER,
                bold: true
            });

            const linksContent = [];

            if (material.uri) {
                linksContent.push(
                    new ExternalHyperlink({
                        link: material.uri,
                        children: [
                            new TextRun({
                                text: "В электронную библиотеку",
                                style: "Hyperlink"
                            })
                        ]
                    })
                );
            }

            if (material.uri && material.fileLink) {
                linksContent.push(new TextRun({ text: " / " }));
            }

            if (material.fileLink) {
                linksContent.push(
                    new ExternalHyperlink({
                        link: material.fileLink,
                        children: [
                            new TextRun({
                                text: "PDF",
                                style: "Hyperlink"
                            })
                        ]
                    })
                );
            }

            if (linksContent.length === 0) {
                linksContent.push(new TextRun({ text: "—" }));
            }

            row.push({
                richContent: linksContent,
                alignment: AlignmentType.CENTER
            });

            rows.push(row);
        });
    });

    const title = showReissueColumn
        ? `${reportData.departmentName}. Потребность в переиздании материалов за период ${startYear}-${endYear} гг. на ${targetYear} год`
        : `${reportData.departmentName}. Отчет по дисциплинам за период ${startYear}-${endYear} гг.`;

    return await generateBaseWordTable({
        title,
        headers,
        rows
    });
};
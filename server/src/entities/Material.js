export class Material {
  constructor({ 
    id, title, alternative_title, abstract_text, 
    language_code, publisher, citation, uri, available_date, issued_year,
    file_link, department_id, pages, departmentName, facultyName,
    authors = [], keywords = [], types = [], specialities = [], material_udcCodes = []
  }) {
    this.id = id;
    this.title = title;
    this.alternativeTitle = alternative_title;
    this.abstract = abstract_text;
    this.language = language_code || 'ru';
    this.publisher = publisher;
    this.citation = citation;
    this.uri = uri;
    this.availableDate = available_date;
    this.pages = pages;
    this.fileLink = file_link;
    this.departmentId = department_id;
    this.year = issued_year;
    this.departmentName = departmentName;
    this.facultyName = facultyName;
    
    // Вложенные сущности
    this.authors = authors; 
    this.keywords = keywords;
    this.types = types;
    this.specialities = specialities;
    this.materialUdcCodes = material_udcCodes;
  }
}
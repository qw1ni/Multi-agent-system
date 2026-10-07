export class Author {
  constructor({ id, name }) {
    if (!name) throw new Error('ФИО обязательно');
    
    this.id = id;
    this.name = name;
  }
}
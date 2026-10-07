export class User {
    constructor(userData) {
        this.id = userData.user_id;
        this.fullName = userData.full_name;
        this.email = userData.email;
        this.login = userData.login;
        this.roleId = userData.role_id
        this.facultyId = userData.faculty_id;
        this.departmentId = userData.department_id;
        this.roleName = userData.roles ? userData.roles.name : null;
        this.facultyName = userData.faculties ? userData.faculties.name : null;
        this.departmentName = userData.departments ? userData.departments.name : null;
    }
}
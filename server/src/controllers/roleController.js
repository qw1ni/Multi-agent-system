import { roleRepository } from '../repositories/roleRepository.js';
import { userRepository } from '../repositories/userRepository.js';
import * as RoleCases from '../use-cases/roleUseCases.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const getAllRoles = asyncHandler (async(req, res) => {
  const roles = await RoleCases.getAllRolesUseCase(roleRepository);
  res.json(roles);
});

export const getRoleById = asyncHandler (async(req, res) => {
  const role = await RoleCases.getRoleByIdUseCase(req.params.id, roleRepository);
  res.json(role);
});

export const createRole = asyncHandler (async(req, res) => {
  const newRole = await RoleCases.createRoleUseCase(req.body, roleRepository);
  res.status(201).json(newRole);
});

export const updateRole = asyncHandler (async(req, res) => {
  const updated = await RoleCases.updateRoleUseCase(req.params.id, req.body, roleRepository);
  res.json(updated);
});

export const deleteRole = asyncHandler (async(req, res) => {
  await RoleCases.deleteRoleUseCase(req.params.id, roleRepository, userRepository);
  res.status(204).send();
});
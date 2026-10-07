import express from 'express';
import { getUserById, getAllUsers, createUser, updateUser, deleteUser, getUsersWithPagAndSearch } from '../controllers/userController.js';

const router = express.Router();

router.get('/', getAllUsers);
router.get('/search', getUsersWithPagAndSearch);
router.get('/:id', getUserById);
router.post('/', createUser);
router.patch('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;
import { db } from '../config/firebase';
import { createCertOutcomeRepository } from './certOutcomeRepository.js';

export default createCertOutcomeRepository(db);

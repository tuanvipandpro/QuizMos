import { db } from '../config/firebase';
import { createCertificationLinkRepository } from './certificationLinkRepository.js';

export default createCertificationLinkRepository(db);

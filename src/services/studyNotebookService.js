import { db } from '../config/firebase';
import { createStudyNotebookRepository } from './studyNotebookRepository.js';

export default createStudyNotebookRepository(db);

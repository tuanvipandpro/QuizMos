import { db } from '../config/firebase';
import { createStudyRoadmapRepository } from './studyRoadmapRepository.js';

export default createStudyRoadmapRepository(db);

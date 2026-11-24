import { db } from '../config/firebase';
import authService from './authService';
import { createCertOutcomeRepository } from './certOutcomeRepository.js';

export default {
  ...createCertOutcomeRepository(db),
  async canModerate(uid) {
    const user = authService.getCurrentUser();
    if (user?.uid !== uid) return false;
    const token = await user.getIdTokenResult();
    return authService.getCurrentUser()?.uid === uid && token.claims.certOutcomeModerator === true;
  },
};

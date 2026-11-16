import React from 'react';
import { Typography } from 'antd';
import { useLanguage } from '../contexts/LanguageContext';
import { CERTIFICATION_SOURCES } from '../data/certificationProfiles';
import { validateCertificationProfile } from '../utils/certificationProfile';

export default function CertificationProfileInfo({ profile }) {
  const { t } = useLanguage();
  try {
    validateCertificationProfile(profile);
  } catch {
    return null;
  }
  const { count, score } = profile;
  return (
    <section className="cert-profile-info" aria-label={t('Certification reference')}>
      <Typography.Text strong>
        {profile.code} · {t('Certification reference')}
      </Typography.Text>
      <Typography.Paragraph>
        {t('Published question count')}:{' '}
        {count.kind === 'unknown'
          ? t('Unverified')
          : count.min === count.max
            ? count.min
            : `${count.min}–${count.max}`}
        {' · '}
        {t('Answering time')}:{' '}
        {profile.minutes ? t('{count} minutes', { count: profile.minutes }) : t('Unverified')}
      </Typography.Paragraph>
      {profile.seatMinutes && (
        <Typography.Paragraph>
          {t('Seat time is {count} minutes; the answering timer excludes check-in.', {
            count: profile.seatMinutes,
          })}
        </Typography.Paragraph>
      )}
      <Typography.Paragraph>
        {score.kind === 'scaled'
          ? t(
              'Official scaled threshold: {threshold}/{maximum}. Raw accuracy cannot be converted to this score.',
              score
            )
          : score.kind === 'points'
            ? t(
                'Official points threshold: {threshold}/{maximum}. This bank does not implement official question weights.',
                score
              )
            : score.kind === 'undisclosed'
              ? t('The provider does not disclose a numeric passing threshold.')
              : t('The official scoring version is unverified for this bank.')}
      </Typography.Paragraph>
      {profile.notes.map((note) => (
        <Typography.Paragraph key={note}>{t(note)}</Typography.Paragraph>
      ))}
      <Typography.Paragraph type="secondary">
        {t(
          'Reviewed {date}. Initial standard exam only; renewal, beta and accommodations are separate.',
          { date: profile.reviewedAt }
        )}
      </Typography.Paragraph>
      <div className="cert-profile-sources">
        {profile.sources.map((key, index) => (
          <a key={key} href={CERTIFICATION_SOURCES[key]} target="_blank" rel="noopener noreferrer">
            {t('Official source {number}', { number: index + 1 })}
          </a>
        ))}
      </div>
    </section>
  );
}

import type { MedicalProfile } from './repositories/medical-profile.repository';
import type { Treatment } from './repositories/treatments.repository';
import type { Provider } from '../providers/providers.repository';
import type { Animal } from '../animals/animals.repository';

export interface EmergencySheetData {
  animal: Animal & { age: { years: number; months: number } | null };
  medicalProfile: MedicalProfile | null;
  treatments: Treatment[];
  providers: Provider[];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function line(label: string, value: string | null | undefined): string {
  if (!value) return '';
  return `<p><strong>${escapeHtml(label)} :</strong> ${escapeHtml(value)}</p>`;
}

const PROVIDER_TYPE_LABELS: Record<string, string> = {
  veto: 'Veto',
  osteo: 'Osteo',
  marechal: 'Marechal-ferrant',
  pension: 'Pension',
  toiletteur: 'Toiletteur',
  educateur: 'Educateur',
  autre: 'Autre',
};

const PAGE_STYLES = `
  body { font-family: -apple-system, Roboto, Arial, sans-serif; background: #FBF5E9; color: #3A3226; margin: 0; padding: 24px 16px; }
  .card { background: #FAF6EF; border-radius: 12px; padding: 16px; margin-bottom: 16px; max-width: 480px; margin-left: auto; margin-right: auto; }
  h1 { font-size: 22px; text-align: center; margin-bottom: 4px; }
  .subtitle { text-align: center; color: #8A7B68; margin-bottom: 24px; }
  h2 { font-size: 15px; margin: 0 0 8px; }
  p { margin: 0 0 6px; }
  a { color: #B8863B; }
  .empty { color: #8A7B68; }
`;

export function renderEmergencySheetHtml(sheet: EmergencySheetData): string {
  const { animal, medicalProfile, treatments, providers } = sheet;

  const identityLines = [
    animal.currentWeightKg != null
      ? line('Poids', `${animal.currentWeightKg} kg`)
      : '',
    line('Puce / tatouage', animal.microchipNumber),
    line('Robe / couleur', animal.color),
  ].join('');

  const medicalLines = medicalProfile
    ? [
        line('Maladies chroniques', medicalProfile.chronicConditions),
        line('Allergies', medicalProfile.allergies),
        line('Regime particulier', medicalProfile.dietaryNeeds),
        line('Notes comportementales', medicalProfile.behavioralNotes),
        line('Groupe sanguin', medicalProfile.bloodType),
        line('Assurance', medicalProfile.insuranceProvider),
        medicalProfile.referringVetName
          ? line(
              'Veto referent',
              `${medicalProfile.referringVetName}${medicalProfile.referringVetPhone ? ` — ${medicalProfile.referringVetPhone}` : ''}`,
            )
          : '',
      ].join('') || '<p class="empty">Aucune information renseignee.</p>'
    : '<p class="empty">Aucune information renseignee.</p>';

  const treatmentsHtml =
    treatments.length > 0
      ? treatments
          .map(
            (t) =>
              `<p>${escapeHtml(t.name)}${t.dosage ? ` — ${escapeHtml(t.dosage)}` : ''}${t.frequency ? ` (${escapeHtml(t.frequency)})` : ''}</p>`,
          )
          .join('')
      : '<p class="empty">Aucun traitement en cours.</p>';

  const providersHtml =
    providers.length > 0
      ? providers
          .map((p) => {
            const typeLabel = PROVIDER_TYPE_LABELS[p.type] ?? p.type;
            const phone = p.phone
              ? ` — <a href="tel:${escapeHtml(p.phone)}">${escapeHtml(p.phone)}</a>`
              : '';
            return `<p>${escapeHtml(typeLabel)} : ${escapeHtml(p.name)}${phone}</p>`;
          })
          .join('')
      : '<p class="empty">Aucun intervenant associe.</p>';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Fiche d'urgence — ${escapeHtml(animal.name)}</title>
<style>${PAGE_STYLES}</style>
</head>
<body>
  <h1>${escapeHtml(animal.name)}</h1>
  <p class="subtitle">${escapeHtml(animal.species)}${animal.breed ? ` — ${escapeHtml(animal.breed)}` : ''}${animal.age ? ` — ${animal.age.years} an(s) ${animal.age.months} mois` : ''}</p>

  <div class="card">
    <h2>Identite</h2>
    ${identityLines || '<p class="empty">—</p>'}
  </div>

  <div class="card">
    <h2>Fiche medicale</h2>
    ${medicalLines}
  </div>

  <div class="card">
    <h2>Traitements en cours</h2>
    ${treatmentsHtml}
  </div>

  <div class="card">
    <h2>Intervenants</h2>
    ${providersHtml}
  </div>
</body>
</html>`;
}

export function renderEmergencySheetErrorHtml(message: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Fiche d'urgence</title>
<style>${PAGE_STYLES}</style>
</head>
<body>
  <div class="card">
    <h1>Lien indisponible</h1>
    <p>${escapeHtml(message)}</p>
  </div>
</body>
</html>`;
}

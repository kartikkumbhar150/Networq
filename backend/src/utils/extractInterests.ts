/**
 * Extracts a deduplicated, normalized list of interest keywords
 * from a user's profile data. Used for the `interests` field
 * which powers future AI/ML recommendation systems.
 */

const STOPWORDS = new Set([
  'and','the','of','in','at','for','to','a','an','with','on','is','are','was','were',
  'has','have','had','be','been','being','that','this','my','your','our','their',
  'led','worked','built','created','developed','managed','used','using','as','by',
  'from','or','not','but','if','it','its','we','they','he','she','which','who',
  'what','when','where','how','i','me','we','team','project','company','work',
  'experience', 'skills', 'role', 'position', 'responsible', 'responsibilities',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s+#.]/g, ' ')
    .split(/\s+/)
    .map(t => t.trim())
    .filter(t => t.length > 2 && !STOPWORDS.has(t));
}

export function extractInterests(profile: Record<string, any>): string[] {
  const raw: string[] = [];

  // Skills — highest signal
  if (Array.isArray(profile.skills)) {
    profile.skills.forEach((s: any) => { if (s?.name) raw.push(s.name); });
  }

  // Experience skills + title + role keywords
  if (Array.isArray(profile.experience)) {
    profile.experience.forEach((exp: any) => {
      if (exp?.skills) exp.skills.forEach((s: string) => raw.push(s));
      if (exp?.title) tokenize(exp.title).forEach(t => raw.push(t));
      if (exp?.description) tokenize(exp.description).slice(0, 10).forEach(t => raw.push(t));
    });
  }

  // Education — field of study and degree are strong indicators
  if (Array.isArray(profile.education)) {
    profile.education.forEach((edu: any) => {
      if (edu?.fieldOfStudy) tokenize(edu.fieldOfStudy).forEach(t => raw.push(t));
      if (edu?.degree) tokenize(edu.degree).forEach(t => raw.push(t));
    });
  }

  // Project skills
  if (Array.isArray(profile.projects)) {
    profile.projects.forEach((p: any) => {
      if (p?.skills) p.skills.forEach((s: string) => raw.push(s));
      if (p?.name) tokenize(p.name).forEach(t => raw.push(t));
    });
  }

  // Certifications
  if (Array.isArray(profile.certifications)) {
    profile.certifications.forEach((c: any) => {
      if (c?.name) tokenize(c.name).forEach(t => raw.push(t));
    });
  }

  // Volunteer causes
  if (Array.isArray(profile.volunteer)) {
    profile.volunteer.forEach((v: any) => {
      if (v?.cause) raw.push(v.cause);
    });
  }

  // Headline
  if (profile.headline) {
    tokenize(profile.headline).forEach(t => raw.push(t));
  }

  // Normalize: trim, lowercase, deduplicate
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of raw) {
    const normalized = item.trim().toLowerCase();
    if (normalized.length > 1 && !seen.has(normalized)) {
      seen.add(normalized);
      result.push(item.trim()); // preserve original casing
    }
  }

  return result.slice(0, 100); // cap at 100 interests
}

// lib/coverLetterTemplates.ts
// A library of cover-letter templates the helper can generate when applying.
//
// WHY: the "Generate Cover Letter" button used ONE hardcoded paragraph, so every
// helper's letter read identically. This provides 5 distinct letters for each of
// the 6 job categories (30 total), tailored to that kind of work, so a Cook's
// letter talks about meals and a Gardener's about plants. The helper can cycle
// through templates (capped per application) and then edit the result.
//
// Placeholders filled at pick time: {employer}, {job}, {category}.

export type JobLike = {
  parent_name?: string | null;
  title?: string | null;
  categories?: (string | null | undefined)[] | null;
  category_name?: string | null;
};

/** Max times a helper may press "Generate" for a single application. */
export const MAX_GENERATIONS = 3;

// Canonical category keys mirror ref_categories.category_name.
type CategoryKey = 'General Househelp' | 'Yaya' | 'Cook' | 'Gardening' | 'Laundry Person' | 'Others';

const TEMPLATES: Record<CategoryKey, string[]> = {
  'General Househelp': [
    `Dear {employer},\n\nI am writing to apply for the {job} position in your household. I take pride in keeping a home clean, organized, and comfortable — from sweeping and mopping to laundry, dishwashing, and general tidying. I am hardworking, trustworthy, and pay close attention to detail.\n\nI would be grateful for the chance to help your family maintain a happy, well-kept home. Thank you for considering my application.\n\nRespectfully yours,\n[Your Name]`,
    `Dear {employer},\n\nI am very interested in the {job} role you posted. I have experience handling day-to-day household chores — cleaning, organizing, running errands, and keeping everything in order so the family can focus on what matters. I am reliable, honest, and easy to work with.\n\nI hope to have the opportunity to serve your household with care and dedication. Thank you very much.\n\nSincerely,\n[Your Name]`,
    `Dear {employer},\n\nGood day! I would like to express my interest in the {job} position. I am used to managing a full range of home tasks and I work with honesty, patience, and a positive attitude. I believe a tidy home makes a happy family, and I would do my best to keep yours that way.\n\nThank you for taking the time to review my application.\n\nWarm regards,\n[Your Name]`,
    `Dear {employer},\n\nI am applying for the {job} role in your home. I am flexible and willing to help wherever needed — cleaning, laundry, marketing, and light kitchen work. I follow instructions well and always aim to leave the house spotless.\n\nI would truly appreciate the chance to be part of your household. Thank you for your consideration.\n\nRespectfully,\n[Your Name]`,
    `Dear {employer},\n\nI hope this message finds you well. I am interested in the {job} position and confident I can keep your home clean and orderly. I am diligent, dependable, and respectful of the family's privacy and routine.\n\nI look forward to the possibility of working with you. Thank you very much for your time.\n\nSincerely,\n[Your Name]`,
  ],
  'Yaya': [
    `Dear {employer},\n\nI am writing to apply for the {job} position. I love caring for children and have patience, warmth, and energy to keep them safe, happy, and learning. I can help with feeding, bathing, playtime, and daily routines while giving each child gentle, attentive care.\n\nIt would be a joy to help look after your little ones. Thank you for considering my application.\n\nWarmly,\n[Your Name]`,
    `Dear {employer},\n\nI am very interested in the {job} role in your family. Caring for children is close to my heart — I am nurturing, watchful, and dependable, and I make sure the kids are well-fed, clean, and engaged throughout the day. Their safety is always my first priority.\n\nI would be grateful for the chance to care for your children. Thank you so much.\n\nSincerely,\n[Your Name]`,
    `Dear {employer},\n\nGood day! I would like to apply as your {job}. I enjoy being with children and helping them grow through play, routine, and lots of patience. I am gentle, responsible, and attentive to each child's needs and moods.\n\nI hope to bring warmth and reliable care to your household. Thank you for your kind consideration.\n\nRespectfully,\n[Your Name]`,
    `Dear {employer},\n\nI am applying for the {job} position. I have a caring, patient nature and I am comfortable handling feeding schedules, naps, hygiene, and safe, fun activities. I treat every child as if they were my own and keep a close, loving eye on them.\n\nI would love the opportunity to help care for your children. Thank you very much.\n\nWarm regards,\n[Your Name]`,
    `Dear {employer},\n\nI hope you are doing well. I am interested in the {job} role and confident in providing loving, dependable childcare. I am alert, affectionate, and organized with daily routines, and I always put the children's safety and happiness first.\n\nThank you for reviewing my application — I hope to hear from you.\n\nSincerely,\n[Your Name]`,
  ],
  'Cook': [
    `Dear {employer},\n\nI am writing to apply for the {job} position. I enjoy preparing wholesome, flavorful meals and can cook a variety of Filipino and everyday dishes. I keep the kitchen clean and safe, plan meals around the family's tastes, and take care with fresh ingredients.\n\nIt would be my pleasure to cook nourishing meals for your family. Thank you for considering my application.\n\nRespectfully,\n[Your Name]`,
    `Dear {employer},\n\nI am very interested in the {job} role. Cooking is my passion — I can prepare daily meals, budget-friendly menus, and special dishes for occasions, all while keeping good hygiene in the kitchen. I love seeing a family enjoy the food I make.\n\nI would be grateful for the chance to cook for your household. Thank you very much.\n\nSincerely,\n[Your Name]`,
    `Dear {employer},\n\nGood day! I would like to apply as your {job}. I am experienced in meal planning, marketing for fresh ingredients, and preparing tasty, balanced dishes the whole family will enjoy. I keep the kitchen tidy and follow safe food-handling practices.\n\nI hope to bring good food and a clean kitchen to your home. Thank you for your consideration.\n\nWarm regards,\n[Your Name]`,
    `Dear {employer},\n\nI am applying for the {job} position. I can cook a wide range of meals — from simple everyday ulam to dishes for guests — and I am mindful of dietary needs and preferences. I take pride in fresh, well-prepared, and lovingly cooked food.\n\nI would truly enjoy cooking for your family. Thank you for taking the time to consider me.\n\nSincerely,\n[Your Name]`,
    `Dear {employer},\n\nI hope this finds you well. I am interested in the {job} role and confident in my kitchen skills. I prepare clean, delicious, and affordable meals, manage ingredients wisely, and adjust recipes to suit your family's taste.\n\nThank you for reviewing my application — I would love to cook for you.\n\nRespectfully,\n[Your Name]`,
  ],
  'Gardening': [
    `Dear {employer},\n\nI am writing to apply for the {job} position. I have a genuine love for plants and enjoy keeping gardens healthy and beautiful — watering, pruning, weeding, and caring for the lawn. I am hardworking and happy to work outdoors in all seasons.\n\nIt would be a pleasure to help your garden flourish. Thank you for considering my application.\n\nRespectfully,\n[Your Name]`,
    `Dear {employer},\n\nI am very interested in the {job} role. I know how to care for different plants, trim hedges, maintain a tidy lawn, and keep outdoor spaces neat. I am reliable, patient, and take pride in seeing a garden thrive under my care.\n\nI would be grateful for the chance to tend your garden. Thank you very much.\n\nSincerely,\n[Your Name]`,
    `Dear {employer},\n\nGood day! I would like to apply as your {job}. I enjoy the work of watering, planting, weeding, and pruning, and I keep tools and pathways clean and orderly. A well-kept garden is something I truly take pride in.\n\nI hope to help make your outdoor space green and inviting. Thank you for your consideration.\n\nWarm regards,\n[Your Name]`,
    `Dear {employer},\n\nI am applying for the {job} position. I am experienced in lawn maintenance and plant care, and I am comfortable with regular upkeep as well as seasonal tasks. I work carefully and always leave the garden looking its best.\n\nI would love the opportunity to care for your plants and grounds. Thank you for your time.\n\nSincerely,\n[Your Name]`,
    `Dear {employer},\n\nI hope you are well. I am interested in the {job} role and confident in keeping your garden and lawn healthy and beautiful. I am diligent, detail-oriented, and enjoy honest outdoor work.\n\nThank you for reviewing my application — I hope to help your garden grow.\n\nRespectfully,\n[Your Name]`,
  ],
  'Laundry Person': [
    `Dear {employer},\n\nI am writing to apply for the {job} position. I am careful and thorough with laundry — washing, drying, ironing, and neatly folding clothes while treating delicate fabrics with care. I keep the laundry area clean and organized at all times.\n\nIt would be my pleasure to keep your family's clothes fresh and well-pressed. Thank you for considering me.\n\nRespectfully,\n[Your Name]`,
    `Dear {employer},\n\nI am very interested in the {job} role. I handle laundry with attention to detail — sorting properly, removing stains, ironing crisply, and folding everything neatly. I am reliable and mindful of each garment's care instructions.\n\nI would be grateful for the chance to take care of your laundry. Thank you very much.\n\nSincerely,\n[Your Name]`,
    `Dear {employer},\n\nGood day! I would like to apply as your {job}. I am experienced in washing, ironing, and organizing clothes so they are always clean, fresh, and ready to wear. I work carefully to protect fabrics and keep the laundry space tidy.\n\nI hope to help keep your household's clothing in great condition. Thank you for your consideration.\n\nWarm regards,\n[Your Name]`,
    `Dear {employer},\n\nI am applying for the {job} position. I take pride in neatly pressed, fresh-smelling laundry and I am patient with delicate items and proper folding. I am dependable and keep a clean, orderly work area.\n\nI would truly appreciate the opportunity to serve your household. Thank you for your time.\n\nSincerely,\n[Your Name]`,
    `Dear {employer},\n\nI hope this finds you well. I am interested in the {job} role and confident in handling all laundry tasks with care — from washing and stain removal to ironing and folding. I am thorough, reliable, and respectful of your family's belongings.\n\nThank you for reviewing my application.\n\nRespectfully,\n[Your Name]`,
  ],
  'Others': [
    `Dear {employer},\n\nI am writing to express my strong interest in the {job} position you posted. I am a hardworking, honest, and dependable person, and I am confident I can perform the duties required with dedication and care.\n\nI would welcome the opportunity to serve your household well. Thank you for considering my application.\n\nSincerely,\n[Your Name]`,
    `Dear {employer},\n\nI am very interested in the {job} role. I am reliable, quick to learn, and always give my best in any task assigned to me. I take my responsibilities seriously and work with a positive, respectful attitude.\n\nI hope to have the chance to contribute to your household. Thank you very much.\n\nRespectfully,\n[Your Name]`,
    `Dear {employer},\n\nGood day! I would like to apply for the {job} position. I am flexible, trustworthy, and committed to doing quality work. Whatever the task, I approach it with patience and care, and I follow instructions carefully.\n\nI would be grateful for the opportunity to work with your family. Thank you for your consideration.\n\nWarm regards,\n[Your Name]`,
    `Dear {employer},\n\nI am applying for the {job} role. I believe my willingness to work hard, my honesty, and my eagerness to help make me a good fit for your household. I am dependable and always aim to meet your expectations.\n\nThank you for taking the time to review my application. I hope to hear from you.\n\nSincerely,\n[Your Name]`,
    `Dear {employer},\n\nI hope you are doing well. I am interested in the {job} position and confident I can be a valuable help to your family. I am diligent, respectful, and committed to doing my work with care and integrity.\n\nThank you very much for considering my application.\n\nRespectfully,\n[Your Name]`,
  ],
};

const CATEGORY_KEYS = Object.keys(TEMPLATES) as CategoryKey[];

/** Resolve the best category bucket for a job, falling back to "Others". */
function resolveCategory(job: JobLike): CategoryKey {
  const candidates = [
    job.category_name,
    ...((job.categories ?? []) as (string | null | undefined)[]),
    job.title,
  ]
    .filter(Boolean)
    .map((c) => String(c).toLowerCase());

  for (const key of CATEGORY_KEYS) {
    if (key === 'Others') continue;
    const needle = key.toLowerCase();
    const short = needle.split(' ')[0]; // "laundry", "general", …
    if (candidates.some((c) => c.includes(needle) || c.includes(short))) return key;
  }
  return 'Others';
}

/**
 * Return the n-th cover-letter template for a job (cycling within its category),
 * with placeholders filled. `n` is a 0-based generation index.
 */
export function pickCoverLetter(job: JobLike, n: number): string {
  const key = resolveCategory(job);
  const bucket = TEMPLATES[key];
  const tmpl = bucket[((n % bucket.length) + bucket.length) % bucket.length];
  return tmpl
    .replace(/\{employer\}/g, job.parent_name?.trim() || 'Employer')
    .replace(/\{job\}/g, job.title?.trim() || 'this')
    .replace(/\{category\}/g, key === 'Others' ? 'household work' : key);
}

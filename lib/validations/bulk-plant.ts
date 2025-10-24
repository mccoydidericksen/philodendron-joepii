import { z } from 'zod';

// Transform string boolean values to actual booleans
const booleanString = z
  .string()
  .optional()
  .transform((val) => {
    if (!val || val === '') return undefined;
    const lower = val.toLowerCase().trim();
    if (lower === 'true' || lower === 'yes' || lower === '1') return true;
    if (lower === 'false' || lower === 'no' || lower === '0') return false;
    return undefined;
  });

// Transform empty strings to undefined for optional fields
const optionalString = z
  .string()
  .optional()
  .transform((val) => (val === '' ? undefined : val));

// Transform numeric strings to numbers
const optionalNumber = z
  .string()
  .optional()
  .transform((val) => {
    if (!val || val === '') return undefined;
    const num = parseFloat(val);
    return isNaN(num) ? undefined : num.toString();
  });

// Schema for a single row in the CSV
export const BulkPlantRowSchema = z.object({
  // Required fields
  name: z.string().min(1, 'Plant name is required'),
  species_type: z.string().min(1, 'Species type is required'),
  species_name: z.string().min(1, 'Species name is required'),
  location: z.string().min(1, 'Location is required'),
  date_acquired: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format (e.g., 2024-01-15)')
    .refine(
      (date) => {
        const d = new Date(date);
        return d instanceof Date && !isNaN(d.getTime());
      },
      { message: 'Invalid date' }
    ),

  // Optional physical attributes
  pot_size: optionalString,
  pot_type: optionalString,
  pot_color: optionalString,
  soil_type: optionalString,
  has_drainage: booleanString,
  current_height_in: optionalNumber,
  current_width_in: optionalNumber,

  // Optional care requirements
  light_level: z
    .enum(['low', 'medium', 'bright-indirect', 'bright-direct', ''])
    .optional()
    .transform((val) => (val === '' ? undefined : val)),
  humidity_preference: z
    .enum(['low', 'medium', 'high', ''])
    .optional()
    .transform((val) => (val === '' ? undefined : val)),
  min_temperature_f: optionalNumber,
  max_temperature_f: optionalNumber,
  fertilizer_type: optionalString,
  growth_stage: z
    .enum(['seedling', 'juvenile', 'mature', 'flowering', ''])
    .optional()
    .transform((val) => (val === '' ? undefined : val)),

  // Optional additional info
  toxicity: optionalString,
  native_region: optionalString,
  growth_rate: z
    .enum(['slow', 'medium', 'fast', ''])
    .optional()
    .transform((val) => (val === '' ? undefined : val)),
  difficulty_level: z
    .enum(['beginner', 'intermediate', 'advanced', ''])
    .optional()
    .transform((val) => (val === '' ? undefined : val)),
  purchase_location: optionalString,
  purchase_price: z
    .string()
    .optional()
    .transform((val) => {
      if (!val || val === '') return undefined;
      // Remove currency symbols and parse
      const cleaned = val.replace(/[$,]/g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? undefined : Math.round(num * 100); // Convert to cents
    }),
  notes: optionalString,

  // Last care dates (optional) for auto-task generation
  last_watered: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val === '') return true;
        const d = new Date(val);
        return d instanceof Date && !isNaN(d.getTime());
      },
      { message: 'Invalid date format (use YYYY-MM-DD)' }
    )
    .transform((val) => (val && val !== '' ? new Date(val) : undefined)),
  last_fertilized: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val === '') return true;
        const d = new Date(val);
        return d instanceof Date && !isNaN(d.getTime());
      },
      { message: 'Invalid date format (use YYYY-MM-DD)' }
    )
    .transform((val) => (val && val !== '' ? new Date(val) : undefined)),
  last_misted: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val === '') return true;
        const d = new Date(val);
        return d instanceof Date && !isNaN(d.getTime());
      },
      { message: 'Invalid date format (use YYYY-MM-DD)' }
    )
    .transform((val) => (val && val !== '' ? new Date(val) : undefined)),
  last_repotted: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val === '') return true;
        const d = new Date(val);
        return d instanceof Date && !isNaN(d.getTime());
      },
      { message: 'Invalid date format (use YYYY-MM-DD)' }
    )
    .transform((val) => (val && val !== '' ? new Date(val) : undefined)),
});

export type BulkPlantRow = z.infer<typeof BulkPlantRowSchema>;

// Expected CSV headers (in order)
export const CSV_HEADERS = [
  'name',
  'species_type',
  'species_name',
  'location',
  'date_acquired',
  'pot_size',
  'pot_type',
  'pot_color',
  'soil_type',
  'has_drainage',
  'current_height_in',
  'current_width_in',
  'light_level',
  'humidity_preference',
  'min_temperature_f',
  'max_temperature_f',
  'fertilizer_type',
  'growth_stage',
  'toxicity',
  'native_region',
  'growth_rate',
  'difficulty_level',
  'purchase_location',
  'purchase_price',
  'notes',
  'last_watered',
  'last_fertilized',
  'last_misted',
  'last_repotted',
] as const;

// Human-readable header labels for the template
export const CSV_HEADER_LABELS = {
  name: 'Plant Name *',
  species_type: 'Species Type * (e.g., Philodendron, Monstera, Pothos)',
  species_name: 'Species Name * (e.g., Pink Princess, Deliciosa)',
  location: 'Location * (e.g., Living Room, Kitchen)',
  date_acquired: 'Date Acquired * (YYYY-MM-DD)',
  pot_size: 'Pot Size (e.g., 6 inch, 10 inch)',
  pot_type: 'Pot Type (e.g., Ceramic, Plastic, Terracotta)',
  pot_color: 'Pot Color',
  soil_type: 'Soil Type',
  has_drainage: 'Has Drainage? (yes/no)',
  current_height_in: 'Current Height (inches)',
  current_width_in: 'Current Width (inches)',
  light_level: 'Light Level (low, medium, bright-indirect, bright-direct)',
  humidity_preference: 'Humidity (low, medium, high)',
  min_temperature_f: 'Min Temperature (°F)',
  max_temperature_f: 'Max Temperature (°F)',
  fertilizer_type: 'Fertilizer Type',
  growth_stage: 'Growth Stage (seedling, juvenile, mature, flowering)',
  toxicity: 'Toxicity Info',
  native_region: 'Native Region',
  growth_rate: 'Growth Rate (slow, medium, fast)',
  difficulty_level: 'Difficulty (beginner, intermediate, advanced)',
  purchase_location: 'Purchase Location',
  purchase_price: 'Purchase Price (e.g., 25.99)',
  notes: 'Notes',
  last_watered: 'Last Watered (YYYY-MM-DD, optional)',
  last_fertilized: 'Last Fertilized (YYYY-MM-DD, optional)',
  last_misted: 'Last Misted (YYYY-MM-DD, optional)',
  last_repotted: 'Last Repotted (YYYY-MM-DD, optional)',
};

// Example row for the template
export const CSV_EXAMPLE_ROW = {
  name: 'My Pink Princess',
  species_type: 'Philodendron',
  species_name: 'Pink Princess',
  location: 'Living Room',
  date_acquired: '2024-01-15',
  pot_size: '6 inch',
  pot_type: 'Ceramic',
  pot_color: 'White',
  soil_type: 'Well-draining potting mix',
  has_drainage: 'yes',
  current_height_in: '12',
  current_width_in: '8',
  light_level: 'bright-indirect',
  humidity_preference: 'high',
  min_temperature_f: '65',
  max_temperature_f: '80',
  fertilizer_type: 'Liquid 20-20-20',
  growth_stage: 'juvenile',
  toxicity: 'Toxic to pets',
  native_region: 'South America',
  growth_rate: 'medium',
  difficulty_level: 'intermediate',
  purchase_location: 'Local nursery',
  purchase_price: '45.99',
  notes: 'Needs consistent watering and humidity',
  last_watered: '2024-10-20',
  last_fertilized: '2024-10-15',
  last_misted: '2024-10-22',
  last_repotted: '2024-06-01',
};

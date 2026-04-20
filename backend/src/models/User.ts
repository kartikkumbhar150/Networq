import mongoose, { Schema, Document } from 'mongoose';

// ─── Reusable sub-schemas ──────────────────────────────────────────────────────

const ExperienceSchema = new Schema({
  company:        { type: String },
  title:          { type: String },
  employmentType: { type: String, enum: ['Full-time','Part-time','Self-employed','Freelance','Contract','Internship','Apprenticeship','Seasonal',''] , default: '' },
  location:       { type: String },
  locationType:   { type: String, enum: ['On-site','Hybrid','Remote',''], default: '' },
  startMonth:     { type: Number },
  startYear:      { type: Number },
  endMonth:       { type: Number },
  endYear:        { type: Number },
  isCurrentRole:  { type: Boolean, default: false },
  description:    { type: String },
  skills:         [{ type: String }],
  companyEmail:   { type: String, default: '' },
  isVerified:     { type: Boolean, default: false },
}, { _id: true });

const EducationSchema = new Schema({
  school:       { type: String },
  degree:       { type: String },
  fieldOfStudy: { type: String },
  startYear:    { type: Number },
  endYear:      { type: Number },
  grade:        { type: String },
  activities:   { type: String },
  description:  { type: String },
}, { _id: true });

const CertificationSchema = new Schema({
  name:          { type: String },
  issuingOrg:    { type: String },
  issueMonth:    { type: Number },
  issueYear:     { type: Number },
  expiryMonth:   { type: Number },
  expiryYear:    { type: Number },
  credentialId:  { type: String },
  credentialUrl: { type: String },
}, { _id: true });

const ProjectSchema = new Schema({
  name:           { type: String },
  description:    { type: String },
  url:            { type: String },
  startMonth:     { type: Number },
  startYear:      { type: Number },
  endMonth:       { type: Number },
  endYear:        { type: Number },
  associatedWith: { type: String },
  skills:         [{ type: String }],
}, { _id: true });

const PublicationSchema = new Schema({
  title:       { type: String },
  publisher:   { type: String },
  publishDate: { type: String },
  url:         { type: String },
  description: { type: String },
}, { _id: true });

const HonorSchema = new Schema({
  title:          { type: String },
  issuer:         { type: String },
  date:           { type: String },
  description:    { type: String },
  associatedWith: { type: String },
}, { _id: true });

const LanguageSchema = new Schema({
  name:        { type: String },
  proficiency: { type: String, enum: ['Elementary','Limited Working','Professional Working','Full Professional','Native or Bilingual',''], default: '' },
}, { _id: true });

const VolunteerSchema = new Schema({
  organization:  { type: String },
  role:          { type: String },
  cause:         { type: String },
  startMonth:    { type: Number },
  startYear:     { type: Number },
  endMonth:      { type: Number },
  endYear:       { type: Number },
  isCurrentRole: { type: Boolean, default: false },
  description:   { type: String },
}, { _id: true });

const CourseSchema = new Schema({
  name:           { type: String },
  number:         { type: String },
  associatedWith: { type: String },
}, { _id: true });

// ─── Profile Subdocument ───────────────────────────────────────────────────────
const ProfileSchema = new Schema({
  // Basic
  headline:       { type: String, default: '' },
  summary:        { type: String, default: '' },
  location:       { type: String, default: '' },
  pronouns:       { type: String, default: '' },
  profilePhoto:   { type: String, default: '' }, // base64 data URL
  coverPhoto:     { type: String, default: '' }, // base64 data URL
  website:        { type: String, default: '' },
  openToWork:     { type: Boolean, default: false },
  openToWorkTypes:{ type: [String], default: [] }, // Full-time, Part-time, etc.

  // Contact
  phone:        { type: String, default: '' },
  linkedinUrl:  { type: String, default: '' },
  githubUrl:    { type: String, default: '' },
  twitterUrl:   { type: String, default: '' },
  portfolioUrl: { type: String, default: '' },

  // Sections
  experience:    { type: [ExperienceSchema],    default: [] },
  education:     { type: [EducationSchema],     default: [] },
  skills:        { type: [{ name: String, endorsements: { type: Number, default: 0 } }], default: [] },
  certifications:{ type: [CertificationSchema], default: [] },
  projects:      { type: [ProjectSchema],       default: [] },
  publications:  { type: [PublicationSchema],   default: [] },
  honors:        { type: [HonorSchema],         default: [] },
  languages:     { type: [LanguageSchema],      default: [] },
  volunteer:     { type: [VolunteerSchema],     default: [] },
  courses:       { type: [CourseSchema],        default: [] },
}, { _id: false });

// ─── Main User Schema ──────────────────────────────────────────────────────────
export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash?: string;
  authProvider: 'local' | 'google' | 'github';
  providerId?: string;
  accountType: 'user' | 'company';
  companyDetails?: { companyName: string; cin: string; gstin: string };
  isVerifiedCompany: boolean;
  facePointId: string | null;
  isVerified: boolean;
  profile: Record<string, any>;
  interests: string[];  // auto-extracted from profile — used for recommendations
  
  // Referral & Rewards System
  referralCode: string;
  referredBy?: string; // Storing referralCode of the inviter
  referralCount: number;
  verifiedReferralCount: number;
  hasReached1000MilestoneAt?: Date;
  promoCredits: number;
  milestoneBadges: string[];
  boostedUntil?: Date;

  // DigiLocker Identity Verification
  isDigilockerVerified: boolean;
  digilockerData?: {
    aadhaarName?: string;
    dob?: string;
    gender?: string;
    digilockerId?: string;
    verifiedAt?: Date;
  };

  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name:          { type: String, required: true, trim: true },
    email:         { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash:  { type: String }, // Optional for OAuth
    authProvider:  { type: String, enum: ['local', 'google', 'github'], default: 'local' },
    providerId:    { type: String },
    accountType:   { type: String, enum: ['user','company'], default: 'user' },
    companyDetails: {
      companyName: { type: String },
      cin:         { type: String },
      gstin:       { type: String },
    },
    isVerifiedCompany: { type: Boolean, default: false },
    facePointId:       { type: String, default: null }, // Optional, will be null for OAuth
    isVerified:        { type: Boolean, default: false }, // Set true for OAuth
    profile:           { type: ProfileSchema, default: () => ({}) },
    interests:         { type: [String], default: [] },
    
    // Rewards
    referralCode:      { type: String, unique: true, sparse: true },
    referredBy:        { type: String },
    referralCount:     { type: Number, default: 0 },
    verifiedReferralCount: { type: Number, default: 0 },
    hasReached1000MilestoneAt: { type: Date, default: null },
    promoCredits:      { type: Number, default: 0 },
    milestoneBadges:   { type: [String], default: [] },
    boostedUntil:      { type: Date, default: null },

    // DigiLocker Identity Verification
    isDigilockerVerified: { type: Boolean, default: false },
    digilockerData: {
      aadhaarName:   { type: String },
      dob:           { type: String },
      gender:        { type: String },
      digilockerId:  { type: String },
      verifiedAt:    { type: Date },
    },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema);

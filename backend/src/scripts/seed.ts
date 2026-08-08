import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { faker } from '@faker-js/faker';

// Import Models
import User from '../models/User';
import Post from '../models/Post';
import Opportunity from '../models/Opportunity';
import Event from '../models/Event';
import Connection from '../models/Connection';

// Load env variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/';

// ─── TEST ACCOUNT CREDENTIALS ────────────────────────────────────────────────
// Use these to log in on the frontend after seeding!
const TEST_USER_EMAIL = 'testuser@hirex.com';
const TEST_USER_PASSWORD = 'Test@1234';
const TEST_USER_NAME = 'Kartik Kumbhar';

async function seedDatabase() {
  try {
    console.log('🌱 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected.');

    console.log('🗑️  Wiping existing data...');
    await User.deleteMany({});
    await Post.deleteMany({});
    await Opportunity.deleteMany({});
    await Event.deleteMany({});
    await Connection.deleteMany({});
    console.log('✅ Cleared all collections.');

    // ─── 0. Create YOUR test user (with a real password so you can log in) ───
    console.log('🔑 Creating your test account...');
    const passwordHash = await bcrypt.hash(TEST_USER_PASSWORD, 12);
    const testUser = await User.create({
      name: TEST_USER_NAME,
      email: TEST_USER_EMAIL,
      passwordHash: passwordHash,
      accountType: 'user',
      isVerified: true,
      referralCode: 'TESTUSER',
      profile: {
        headline: 'Full Stack Developer & Entrepreneur',
        summary: 'Passionate about building products that make a difference. Experienced in React, Node.js, Python, and cloud architecture.',
        location: 'Mumbai, India',
        profilePhoto: faker.image.avatar(),
        openToWork: true,
        experience: [
          {
            company: 'Google',
            title: 'Software Engineer',
            employmentType: 'Full-time',
            location: 'Bangalore',
            locationType: 'Hybrid',
            startMonth: 6,
            startYear: 2023,
            isCurrentRole: true,
            description: 'Working on Google Cloud Platform services and infrastructure.'
          },
          {
            company: 'Microsoft',
            title: 'SDE Intern',
            employmentType: 'Internship',
            location: 'Hyderabad',
            locationType: 'On-site',
            startMonth: 1,
            startYear: 2023,
            endMonth: 5,
            endYear: 2023,
            isCurrentRole: false,
            description: 'Worked on Azure DevOps pipeline optimizations.'
          }
        ],
        education: [
          {
            school: 'IIT Bombay',
            degree: "Bachelor's",
            fieldOfStudy: 'Computer Science',
            startYear: 2019,
            endYear: 2023,
          }
        ],
        skills: [
          { name: 'JavaScript', endorsements: 42 },
          { name: 'React', endorsements: 38 },
          { name: 'Node.js', endorsements: 35 },
          { name: 'Python', endorsements: 30 },
          { name: 'TypeScript', endorsements: 28 },
        ]
      }
    });
    console.log(`   ✅ Test user created: ${TEST_USER_EMAIL} / ${TEST_USER_PASSWORD}`);

    // ─── 1. Create Companies ─────────────────────────────────────────────────
    console.log('🏢 Generating 10 Companies...');
    const companyNames = [
      'TechNova Solutions', 'Quantum Dynamics Inc', 'GreenLeaf Ventures',
      'Atlas Digital Labs', 'Pinnacle Systems', 'NeuraByte AI',
      'CloudForge Technologies', 'Stellar Innovations', 'Velocity Partners',
      'Horizon Capital Group'
    ];
    const companies: any[] = [];
    for (let i = 0; i < 10; i++) {
      const company = await User.create({
        name: companyNames[i],
        email: `contact@${companyNames[i].toLowerCase().replace(/\s+/g, '')}.com`,
        passwordHash: passwordHash, // same password for convenience
        accountType: 'company',
        isVerifiedCompany: true,
        isVerified: true,
        companyDetails: {
          companyName: companyNames[i],
          cin: faker.string.alphanumeric(21).toUpperCase(),
          gstin: faker.string.alphanumeric(15).toUpperCase(),
        },
        profile: {
          headline: faker.company.catchPhrase(),
          summary: faker.lorem.paragraphs(2),
          location: faker.location.city() + ', ' + faker.location.country(),
          profilePhoto: faker.image.avatar(),
        }
      });
      companies.push(company);
    }
    console.log('   ✅ 10 companies created.');

    // ─── 2. Create Users ─────────────────────────────────────────────────────
    console.log('👤 Generating 50 Users...');
    const users: any[] = [testUser]; // Include test user in the pool
    const skillPool = [
      'JavaScript', 'React', 'Node.js', 'Python', 'TypeScript', 'Go',
      'Java', 'C++', 'Rust', 'Swift', 'Kotlin', 'Ruby', 'PHP',
      'AWS', 'Docker', 'Kubernetes', 'MongoDB', 'PostgreSQL',
      'Machine Learning', 'Data Science', 'UI/UX Design', 'Figma',
      'Product Management', 'Agile', 'DevOps', 'GraphQL', 'Redis',
      'System Design', 'Microservices', 'CI/CD'
    ];
    for (let i = 0; i < 50; i++) {
      const user = await User.create({
        name: faker.person.fullName(),
        email: faker.internet.email().toLowerCase(),
        passwordHash: passwordHash,
        accountType: 'user',
        isVerified: true,
        referralCode: faker.string.alphanumeric(8).toUpperCase(),
        profile: {
          headline: faker.person.jobTitle(),
          summary: faker.lorem.paragraph(),
          location: faker.location.city() + ', ' + faker.location.country(),
          profilePhoto: faker.image.avatar(),
          openToWork: faker.datatype.boolean(),
          experience: Array.from({ length: faker.number.int({ min: 1, max: 3 }) }).map(() => ({
            company: faker.company.name(),
            title: faker.person.jobTitle(),
            employmentType: faker.helpers.arrayElement(['Full-time', 'Part-time', 'Contract', 'Internship']),
            location: faker.location.city(),
            locationType: faker.helpers.arrayElement(['On-site', 'Hybrid', 'Remote']),
            startMonth: faker.number.int({ min: 1, max: 12 }),
            startYear: faker.number.int({ min: 2015, max: 2024 }),
            isCurrentRole: false,
            description: faker.lorem.sentences(2)
          })),
          education: Array.from({ length: faker.number.int({ min: 1, max: 2 }) }).map(() => ({
            school: faker.helpers.arrayElement([
              'MIT', 'Stanford University', 'IIT Delhi', 'IIT Bombay', 'NIT Trichy',
              'Harvard University', 'Oxford University', 'Cambridge University',
              'University of Toronto', 'ETH Zurich', 'BITS Pilani', 'VIT Vellore'
            ]),
            degree: faker.helpers.arrayElement(["Bachelor's", "Master's", "PhD"]),
            fieldOfStudy: faker.helpers.arrayElement([
              'Computer Science', 'Electrical Engineering', 'Business Administration',
              'Data Science', 'Mechanical Engineering', 'Economics', 'Mathematics'
            ]),
            startYear: faker.number.int({ min: 2010, max: 2018 }),
            endYear: faker.number.int({ min: 2014, max: 2023 }),
          })),
          skills: faker.helpers.arrayElements(skillPool, faker.number.int({ min: 3, max: 8 })).map(s => ({
            name: s,
            endorsements: faker.number.int({ min: 0, max: 99 })
          }))
        }
      });
      users.push(user);
    }
    console.log('   ✅ 50 users created.');

    // ─── 3. Connect test user to ALL other users (accepted) ──────────────────
    console.log('🤝 Connecting your test account to all users...');
    for (const u of users) {
      if (u._id.toString() === testUser._id.toString()) continue;
      await Connection.create({
        requesterId: testUser._id.toString(),
        requesterName: testUser.name,
        requesterAvatar: testUser.profile?.profilePhoto || '',
        receiverId: u._id.toString(),
        receiverName: u.name,
        receiverAvatar: u.profile?.profilePhoto || '',
        status: 'accepted'
      });
    }
    console.log('   ✅ Test user connected to all 50 users.');

    // ─── 4. Create random connections between other users ────────────────────
    console.log('🔗 Generating random connections between users...');
    let connCount = 0;
    for (let i = 0; i < 100; i++) {
      const a = faker.helpers.arrayElement(users);
      let b = faker.helpers.arrayElement(users);
      while (b._id.toString() === a._id.toString()) {
        b = faker.helpers.arrayElement(users);
      }
      try {
        await Connection.create({
          requesterId: a._id.toString(),
          requesterName: a.name,
          requesterAvatar: a.profile?.profilePhoto || '',
          receiverId: b._id.toString(),
          receiverName: b.name,
          receiverAvatar: b.profile?.profilePhoto || '',
          status: faker.helpers.arrayElement(['pending', 'accepted'])
        });
        connCount++;
      } catch {
        // Duplicate, skip
      }
    }
    console.log(`   ✅ ${connCount} random connections created.`);

    // ─── 5. Create Posts ─────────────────────────────────────────────────────
    console.log('📝 Generating 100 Posts...');
    const allAuthors = [...users, ...companies];
    for (let i = 0; i < 100; i++) {
      const author = faker.helpers.arrayElement(allAuthors);

      const likeCount = faker.number.int({ min: 0, max: 15 });
      const likes = Array.from({ length: likeCount }).map(() => ({
        userId: faker.helpers.arrayElement(users)._id.toString(),
        likedAt: faker.date.recent({ days: 7 })
      }));

      const commentCount = faker.number.int({ min: 0, max: 5 });
      const comments = Array.from({ length: commentCount }).map(() => {
        const commenter = faker.helpers.arrayElement(users);
        return {
          commentId: new mongoose.Types.ObjectId().toString(),
          authorId: commenter._id.toString(),
          authorName: commenter.name,
          content: faker.helpers.arrayElement([
            'Great insights! Thanks for sharing.',
            'This is really helpful, appreciate it!',
            'Interesting perspective. I\'d love to discuss further.',
            'Congratulations! Well deserved.',
            'Amazing work! Keep it up.',
            faker.lorem.sentence(),
            faker.lorem.sentence(),
          ]),
          createdAt: faker.date.recent({ days: 7 })
        };
      });

      await Post.create({
        authorId: author._id.toString(),
        authorName: author.name,
        authorAvatar: author.profile?.profilePhoto || '',
        content: faker.helpers.arrayElement([
          `🚀 Excited to share that I just ${faker.helpers.arrayElement(['launched a new project', 'got promoted', 'completed a certification', 'joined an amazing team', 'published a research paper'])}! ${faker.lorem.paragraph()}`,
          `💡 ${faker.lorem.paragraphs(2)}`,
          `📢 We're hiring! ${faker.person.jobTitle()} at ${faker.company.name()}. ${faker.lorem.paragraph()}`,
          `🎯 Key takeaways from ${faker.company.catchPhrase()}: ${faker.lorem.paragraph()}`,
          `${faker.lorem.paragraphs(faker.number.int({ min: 1, max: 3 }))}`,
        ]),
        type: 'text',
        likes: likes,
        likeCount: likes.length,
        comments: comments,
        commentCount: comments.length
      });
    }
    console.log('   ✅ 100 posts created.');

    // ─── 6. Create Opportunities ─────────────────────────────────────────────
    console.log('💼 Generating 30 Opportunities...');
    const jobTitles = [
      'Senior React Developer', 'Full Stack Engineer', 'Backend Developer (Node.js)',
      'Machine Learning Engineer', 'Data Scientist', 'DevOps Engineer',
      'Product Manager', 'UI/UX Designer', 'Cloud Architect', 'Mobile Developer',
      'Blockchain Developer', 'Security Engineer', 'QA Lead', 'Tech Lead',
      'VP of Engineering', 'CTO', 'Frontend Architect', 'SRE Engineer',
      'AI Research Scientist', 'Platform Engineer'
    ];
    for (let i = 0; i < 30; i++) {
      const company = faker.helpers.arrayElement(companies);
      const pillar = faker.helpers.arrayElement(['capital', 'procurement', 'alliance']) as 'capital' | 'procurement' | 'alliance';
      
      let oppType = '';
      let extra: any = {};

      if (pillar === 'capital') {
        oppType = faker.helpers.arrayElement(['seed_funding', 'series_a', 'series_b']);
        extra = {
          fundingAmount: faker.number.int({ min: 100000, max: 10000000 }),
          equityOffered: faker.number.int({ min: 2, max: 30 }),
          valuation: faker.number.int({ min: 1000000, max: 100000000 }),
        };
      } else if (pillar === 'procurement') {
        oppType = faker.helpers.arrayElement(['job', 'freelance', 'contract', 'internship']);
        extra = {
          budget: faker.number.int({ min: 50000, max: 500000 }),
          biddingType: faker.helpers.arrayElement(['fixed', 'milestone']),
        };
      } else {
        oppType = faker.helpers.arrayElement(['jv', 'partnership', 'strategic_alliance']);
        extra = {
          allianceType: faker.helpers.arrayElement(['Technology Partnership', 'Distribution Deal', 'Co-development', 'Revenue Share']),
          synergyTags: faker.helpers.arrayElements(['AI', 'Cloud', 'FinTech', 'EdTech', 'HealthTech', 'IoT', 'Blockchain'], 3),
        };
      }

      await Opportunity.create({
        companyId: company._id,
        isFromVerifiedCompany: true,
        pillar: pillar,
        type: oppType,
        title: pillar === 'procurement' ? faker.helpers.arrayElement(jobTitles) : `${faker.company.catchPhrase()} – ${oppType.replace('_', ' ').toUpperCase()}`,
        description: faker.lorem.paragraphs(3),
        requirements: faker.helpers.arrayElements(skillPool, faker.number.int({ min: 3, max: 6 })),
        status: 'open',
        contactEmail: company.email,
        isActive: true,
        ...extra
      });
    }
    console.log('   ✅ 30 opportunities created.');

    // ─── 7. Create Events ────────────────────────────────────────────────────
    console.log('🎉 Generating 20 Events...');
    const eventNames = [
      'TechCrunch Disrupt 2026', 'AI Summit Mumbai', 'React India Conference',
      'Startup Grind Bangalore', 'DevFest Delhi', 'Hack the Future Hackathon',
      'Cloud Innovation Summit', 'FinTech Forum', 'Design Thinking Workshop',
      'Blockchain Expo', 'IoT World Congress', 'Data Science Meetup',
      'Cybersecurity Conference', 'SaaS Growth Summit', 'Entrepreneurship Bootcamp',
      'Women in Tech Summit', 'Open Source Fest', 'Product Hunt Launch Day',
      'Angel Investor Roundtable', 'Venture Capital Masterclass'
    ];
    for (let i = 0; i < 20; i++) {
      const company = faker.helpers.arrayElement(companies);
      const startDate = faker.date.soon({ days: 60 });
      const endDate = new Date(startDate.getTime() + faker.number.int({ min: 2, max: 8 }) * 3600000);

      await Event.create({
        organizerId: company._id,
        title: eventNames[i],
        description: faker.lorem.paragraphs(3),
        venue: `${faker.location.streetAddress()}, ${faker.location.city()}, ${faker.location.country()}`,
        date: startDate,
        endDate: endDate,
        capacity: faker.number.int({ min: 50, max: 1000 }),
        ticketPrice: faker.helpers.arrayElement([0, 0, 0, 499, 999, 1999, 2999]),
        escrowAmount: 0,
        attendanceThreshold: faker.number.int({ min: 50, max: 80 }),
        status: 'published'
      });
    }
    console.log('   ✅ 20 events created.');

    // ─── Done! ───────────────────────────────────────────────────────────────
    console.log('\n' + '═'.repeat(60));
    console.log('✨ SEEDING COMPLETE!');
    console.log('═'.repeat(60));
    console.log(`\n📧 Login Email:    ${TEST_USER_EMAIL}`);
    console.log(`🔑 Login Password: ${TEST_USER_PASSWORD}`);
    console.log(`👤 Login Type:     user`);
    console.log('\nGo to http://localhost:5173/login and use these credentials!');
    console.log('═'.repeat(60) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();

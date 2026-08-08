import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { faker } from '@faker-js/faker';

import User from '../models/User';
import Post from '../models/Post';

dotenv.config();
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/';

const NEW_POSTS = [
  // AI Advancements
  {
    content: "Just read the latest paper on GPT-5 architecture. The advancements in multimodal understanding and reasoning are staggering! We are moving closer to AGI at a pace no one predicted. 🚀 What are your thoughts on the safety implications? #AI #AGI #Tech",
    media: ["https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=1200"]
  },
  {
    content: "The impact of AI in healthcare is saving lives today. A new deep learning model has just outperformed human radiologists in detecting early-stage lung cancer by 24%. Data saves lives! 🏥💻 #HealthTech #ArtificialIntelligence #MachineLearning",
    media: ["https://images.unsplash.com/photo-1576091160550-2173ff9e5eb2?auto=format&fit=crop&q=80&w=1200"]
  },
  {
    content: "Generative AI is completely reshaping the software development lifecycle. With tools like GitHub Copilot and Devin, the role of a software engineer is shifting from writing boilerplate to system architecture and prompt engineering. Exciting times! 💻 #GenerativeAI #SoftwareEngineering",
    media: ["https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=1200"]
  },
  {
    content: "NVIDIA just announced their new Blackwell architecture, claiming a 30x performance increase for LLM inference. The hardware arms race is just as intense as the software one! 🤯 #NVIDIA #Hardware #AI",
    media: ["https://images.unsplash.com/photo-1591405351990-4726e331f141?auto=format&fit=crop&q=80&w=1200"]
  },
  {
    content: "OpenAI's Sora is mind-blowing. Text-to-video generation with realistic physics understanding is going to disrupt Hollywood, marketing, and content creation forever. 🎥✨ #OpenAI #Sora #VideoAI",
    media: ["https://images.unsplash.com/photo-1682695796954-b7d13ac6be76?auto=format&fit=crop&q=80&w=1200"]
  },
  {
    content: "Is copyright law ready for AI? The ongoing lawsuits against major AI companies regarding training data will set precedents that define the future of the internet and intellectual property. ⚖️🤖 #AIethics #Law #TechPolicy",
    media: ["https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&q=80&w=1200"]
  },
  {
    content: "Quantum Machine Learning (QML) is the next frontier. By combining quantum computing with AI, we could solve optimization problems currently impossible for classical supercomputers. ⚛️🧠 #QuantumComputing #QML #FutureTech",
    media: ["https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=1200"]
  },
  {
    content: "The European Union's AI Act has officially passed. This establishes the world's first comprehensive legal framework on Artificial Intelligence, categorizing AI systems by risk. A historic moment for tech regulation! 🇪🇺📜 #EU #AIAct #Regulation",
    media: ["https://images.unsplash.com/photo-1593022356769-8a1ba5f22eb5?auto=format&fit=crop&q=80&w=1200"]
  },
  {
    content: "Robotics powered by foundation models. We are finally seeing robots that can understand natural language commands and figure out how to execute them in unstructured environments. The sci-fi future is here. 🤖📦 #Robotics #FoundationModels",
    media: ["https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=1200"]
  },
  {
    content: "Local LLMs are getting incredibly good. Running a 8B parameter model locally on a MacBook that rivals GPT-3.5 in quality is a huge win for privacy and open-source! 💻🔓 #OpenSource #LLM #Privacy",
    media: ["https://images.unsplash.com/photo-1629654297299-c8506221ca97?auto=format&fit=crop&q=80&w=1200"]
  },

  // Space & Tech
  {
    content: "SpaceX's Starship successfully completed its orbital test flight! This fully reusable super heavy-lift launch vehicle will fundamentally change the economics of space travel and make making humanity multi-planetary a reality. 🚀🪐 #SpaceX #Starship #Mars",
    media: ["https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?auto=format&fit=crop&q=80&w=1200"]
  },
  {
    content: "The James Webb Space Telescope just released a new image of the Pillars of Creation. The level of detail in the infrared spectrum reveals newly forming stars that were previously hidden by dust. Absolutely breathtaking. 🌌🔭 #JWST #Astronomy #Space",
    media: ["https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&q=80&w=1200"]
  },
  {
    content: "NASA’s Artemis II mission crew has been announced! They will be the first humans to travel to the vicinity of the Moon in over 50 years. A huge step forward for the Artemis program. 🌕👩‍🚀 #NASA #Artemis #LunarMission",
    media: ["https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&q=80&w=1200"]
  },
  {
    content: "Nuclear fusion breakthrough! Scientists at the National Ignition Facility have repeatedly achieved net energy gain. We are inching closer to limitless, clean energy. The engineering challenges ahead are immense, but the proof of concept is here. ⚡🔋 #FusionEnergy #CleanTech",
    media: ["https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200"]
  },
  {
    content: "Neuralink successfully implanted its device in a human patient, and they can now control a computer mouse with their thoughts. This brain-computer interface technology could restore autonomy to millions with severe paralysis. 🧠💻 #Neuralink #BCI #MedTech",
    media: ["https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&q=80&w=1200"]
  },
  {
    content: "Apple Vision Pro is redefining spatial computing. After a month of use, the seamless integration of digital content with the physical space is incredible, though the price point remains a barrier for mass adoption. What do you think? 🥽🍏 #SpatialComputing #AR #VR",
    media: ["https://images.unsplash.com/photo-1535223289827-42f1e9919769?auto=format&fit=crop&q=80&w=1200"]
  },
  {
    content: "Solid-state batteries are finally moving from the lab to production. With higher energy density and improved safety over lithium-ion, this is the catalyst needed for the mass adoption of EVs. 🚗⚡ #EV #BatteryTech #Sustainability",
    media: ["https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&q=80&w=1200"]
  },
  {
    content: "The Voyager 1 spacecraft, launched in 1977, is currently over 15 billion miles away from Earth and is STILL sending back data from interstellar space. A true testament to human engineering. 🛰️✨ #Voyager #SpaceExploration",
    media: ["https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?auto=format&fit=crop&q=80&w=1200"]
  },
  {
    content: "India's Chandrayaan-3 successfully soft-landed near the lunar south pole! A historic achievement that makes India the fourth country to land on the Moon and the first to land near the south pole. Proud moment! 🇮🇳🌕 #ISRO #Chandrayaan3 #Space",
    media: ["https://images.unsplash.com/photo-1537420327992-d6e192287183?auto=format&fit=crop&q=80&w=1200"]
  },
  {
    content: "Space debris is becoming a critical issue. With thousands of satellites being launched for mega-constellations like Starlink, the risk of the Kessler syndrome is rising. We need active debris removal tech now. 🛰️💥 #SpaceDebris #Sustainability",
    media: ["https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200"]
  },

  // Global Politics
  {
    content: "The upcoming general elections in multiple major democracies this year will reshape global geopolitics for the next decade. Economic policies, climate agreements, and international trade are all on the ballot. 🗳️🌍 #Elections #Geopolitics #GlobalAffairs",
    media: ["https://images.unsplash.com/photo-1526470608118-5a230559f3ab?auto=format&fit=crop&q=80&w=1200"]
  },
  {
    content: "The BRICS expansion marks a significant shift in the global economic order. With new member states joining, the bloc now represents a massive portion of the global population and GDP. How will this affect the dominance of the US dollar? 💱🌐 #BRICS #Economy #GlobalPolitics",
    media: ["https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&q=80&w=1200"]
  },
  {
    content: "Global supply chains are being rerouted as countries push for 'friend-shoring' and decoupling. The semiconductor industry is at the center of this geopolitical tug-of-war. The CHIPS Act is already transforming manufacturing landscapes. 🏭🔌 #SupplyChain #Semiconductors #Trade",
    media: ["https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=1200"]
  },
  {
    content: "Climate change is no longer just an environmental issue; it is a primary driver of geopolitical instability. Resource scarcity, specifically water disputes, are becoming major flashpoints in international relations. 💧🌡️ #ClimateChange #Geopolitics #Sustainability",
    media: ["https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?auto=format&fit=crop&q=80&w=1200"]
  },
  {
    content: "The transition to renewable energy is creating a new map of global power. Countries with abundant critical minerals like lithium, cobalt, and rare earth elements are the new energy superpowers. ☀️🔋 #RenewableEnergy #CriticalMinerals #EnergyTransition",
    media: ["https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&q=80&w=1200"]
  },
  {
    content: "The concept of 'digital sovereignty' is gaining traction. Nations are demanding data localization and pushing back against foreign tech monopolies to control their citizens' data. The splinternet is becoming a reality. 🌐🔒 #DigitalSovereignty #TechPolicy #DataPrivacy",
    media: ["https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200"]
  },
  {
    content: "Diplomatic efforts are intensifying as nations try to navigate the complex multi-polar world order. Soft power, economic investments, and strategic alliances are more crucial than ever in maintaining stability. 🤝🕊️ #Diplomacy #InternationalRelations",
    media: ["https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&q=80&w=1200"]
  },
  {
    content: "The economic impact of aging populations in developed nations is forcing a rethink of immigration policies and labor markets. Automation and AI will play a role, but systemic changes are inevitable. 📉👥 #Demographics #Economics #Labor",
    media: ["https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&q=80&w=1200"]
  },
  {
    content: "The race for the Arctic is heating up. As ice melts, new shipping routes and unexploited resources are emerging, leading to increased military presence and competing territorial claims in the region. 🧊🚢 #Arctic #Geopolitics",
    media: ["https://images.unsplash.com/photo-1518182170546-076616fd4675?auto=format&fit=crop&q=80&w=1200"]
  },
  {
    content: "Global inflation and high interest rates continue to strain emerging economies, leading to sovereign debt crises in several nations. The IMF and World Bank are facing calls for structural reforms. 📈💰 #Economy #Inflation #GlobalFinance",
    media: ["https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&q=80&w=1200"]
  },

  // National Current Affairs
  {
    content: "India's GDP growth continues to outpace expectations, cementing its position as the fastest-growing major economy. The push for manufacturing and digital infrastructure is yielding incredible results! 🇮🇳📈 #India #Economy #Growth",
    media: ["https://images.unsplash.com/photo-1532453288672-3a27e9be9efd?auto=format&fit=crop&q=80&w=1200"]
  },
  {
    content: "The rapid expansion of the UPI (Unified Payments Interface) globally is a masterclass in digital public infrastructure. Several countries are now adopting the framework. Cashless economy is the future! 💳📱 #UPI #FinTech #DigitalIndia",
    media: ["https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=1200"]
  },
  {
    content: "Major investments in national highway infrastructure are drastically reducing logistics costs and travel times. Connectivity is the backbone of economic progress. 🛣️🚛 #Infrastructure #Development",
    media: ["https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80&w=1200"]
  },
  {
    content: "The startup ecosystem in tier-2 and tier-3 cities is booming! We are moving beyond just Bengaluru and NCR. Innovation is everywhere. 🚀🏙️ #Startups #Entrepreneurship",
    media: ["https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1200"]
  },
  {
    content: "Recent policies promoting electric vehicle manufacturing locally are transforming the automotive sector. Subsidies and PLI schemes are attracting major global players to set up shop. 🚗🔋 #EV #MakeInIndia",
    media: ["https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&q=80&w=1200"]
  },
  {
    content: "The successful completion of massive renewable energy parks is a huge leap towards our net-zero goals. Solar and wind capacity additions are breaking records every quarter. ☀️💨 #RenewableEnergy #Sustainability",
    media: ["https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&q=80&w=1200"]
  },
  {
    content: "The new education policy's emphasis on skill development and flexible learning paths is exactly what the industry needs. Bridging the gap between academia and real-world requirements. 📚🎓 #Education #SkillIndia",
    media: ["https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80&w=1200"]
  },
  {
    content: "Space tech startups are thriving following the privatization of the space sector. We are seeing private launch vehicles and satellite constellations being built entirely in-house. Sky is no longer the limit! 🚀🌌 #SpaceTech #Innovation",
    media: ["https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?auto=format&fit=crop&q=80&w=1200"]
  },
  {
    content: "The integration of AI in agriculture (AgriTech) is helping farmers optimize crop yields, predict weather patterns, and manage resources efficiently. Technology solving real grassroots problems. 🌾💻 #AgriTech #Agriculture",
    media: ["https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&q=80&w=1200"]
  },
  {
    content: "Record foreign direct investment (FDI) inflows indicate strong global confidence in the domestic market. Regulatory simplification and a young demographic are key drivers. 📊💼 #FDI #Investment",
    media: ["https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&q=80&w=1200"]
  },

  // Entertainment & Culture
  {
    content: "The line between gaming and cinema is blurring. With Unreal Engine 5, game developers are achieving photorealism in real-time, and filmmakers are using game engines for virtual production. The future of entertainment is interactive! 🎮🍿 #Gaming #Cinema #UnrealEngine",
    media: ["https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&q=80&w=1200"]
  },
  {
    content: "Streaming platforms have completely democratized global content. Regional cinema and international shows are finding massive global audiences. A great time for diverse storytelling! 🎬🌍 #Streaming #Cinema #Storytelling",
    media: ["https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&q=80&w=1200"]
  },
  {
    content: "Esports is officially a billion-dollar industry. The production value of major tournaments rivals traditional sports, and the viewership is staggering. Competitive gaming is here to stay. 🏆💻 #Esports #Gaming",
    media: ["https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=1200"]
  },
  {
    content: "The resurgence of vinyl records and physical media in a digital-first world is fascinating. People crave tangible experiences and ownership in an era of ephemeral streaming. 🎶📀 #Music #Vinyl",
    media: ["https://images.unsplash.com/photo-1603048297172-c92544798d5e?auto=format&fit=crop&q=80&w=1200"]
  },
  {
    content: "Virtual idols and VTubers are taking over the internet. These animated avatars streaming on Twitch and YouTube are building massive, dedicated communities. A unique intersection of tech and culture. 🎤👾 #VTuber #Streaming",
    media: ["https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=1200"]
  },
  {
    content: "Just attended an incredible immersive art exhibition. Using projection mapping, AR, and interactive sensors, artists are creating spaces that respond to the audience. Art is becoming an experience. 🎨✨ #ImmersiveArt #AR",
    media: ["https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?auto=format&fit=crop&q=80&w=1200"]
  },
  {
    content: "The impact of TikTok and short-form video on music discovery is undeniable. Songs from decades ago are charting again just because they went viral in a trend. The algorithm dictates the hits. 📱🎧 #MusicIndustry #SocialMedia",
    media: ["https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=1200"]
  },
  {
    content: "Generative AI in music creation is raising huge questions about artistry and copyright. Can an AI be considered an artist? What happens when a track mimicking a famous artist goes viral? We need new frameworks. 🎼🤖 #AI #Music",
    media: ["https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=1200"]
  },
  {
    content: "The phenomenon of global fandoms (like K-Pop stans) mobilizing for social causes and charity is incredible. Pop culture communities possess immense power to drive real-world impact. 🌍❤️ #Fandom #Culture",
    media: ["https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&q=80&w=1200"]
  },
  {
    content: "Independent game developers are consistently delivering the most innovative and emotionally resonant experiences in the industry, proving that creativity matters more than massive budgets. 🕹️❤️ #IndieGames #GameDev",
    media: ["https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=1200"]
  },
  
  // Mixed / Extras to reach 50
  {
    content: "The future of work is not just remote; it's asynchronous. By removing the dependency on real-time communication, teams globally are finding deep focus and better work-life balance. 🌍🕒 #FutureOfWork #RemoteWork",
    media: ["https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=1200"]
  },
  {
    content: "Cybersecurity is no longer an IT issue; it's a board-level imperative. With ransomware attacks on critical infrastructure rising, zero-trust architecture is the only way forward. 🔒🛡️ #CyberSecurity #ZeroTrust",
    media: ["https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&q=80&w=1200"]
  },
  {
    content: "Lab-grown meat just received regulatory approval in another country. Cellular agriculture could drastically reduce the environmental footprint of our food system while satisfying global demand. 🥩🔬 #FoodTech #Sustainability",
    media: ["https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=1200"]
  },
  {
    content: "The rise of neurodivergent advocacy in the workplace is long overdue. Companies are finally realizing that accommodating different cognitive styles leads to immense innovation and better problem-solving. 🧠🤝 #Inclusion #Neurodiversity",
    media: ["https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&q=80&w=1200"]
  },
  {
    content: "Web3 and decentralized finance (DeFi) are maturing past the hype cycle. The focus is shifting from speculation to real-world utility, like cross-border payments and tokenized real estate. 🌐⛓️ #Web3 #Crypto #DeFi",
    media: ["https://images.unsplash.com/photo-1621504450181-5d356f61d307?auto=format&fit=crop&q=80&w=1200"]
  },
  {
    content: "The James Webb telescope discovered carbon dioxide on an exoplanet! We are taking the very first steps in determining if potentially habitable worlds exist outside our solar system. 🪐🔭 #Exoplanets #Astronomy",
    media: ["https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?auto=format&fit=crop&q=80&w=1200"]
  },
  {
    content: "Smart cities are utilizing IoT sensors to optimize everything from traffic flow to waste management. The efficiency gains are massive, but it raises important questions about surveillance and privacy. 🏙️📡 #SmartCity #IoT",
    media: ["https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&q=80&w=1200"]
  },
  {
    content: "Direct air capture (DAC) facilities are scaling up. While still expensive, pulling CO2 directly from the atmosphere is going to be a crucial tool in reversing climate change alongside emission reductions. 💨🌳 #ClimateTech #DAC",
    media: ["https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?auto=format&fit=crop&q=80&w=1200"]
  },
  {
    content: "The global push for a 4-day workweek is gaining serious momentum. Pilot programs consistently show that productivity remains the same or increases, while employee burnout drops significantly. It's time for a change. 🗓️📉 #WorkLifeBalance #Productivity",
    media: ["https://images.unsplash.com/photo-1497215842964-222b430dc094?auto=format&fit=crop&q=80&w=1200"]
  },
  {
    content: "Brain-Computer Interfaces aren't just for medicine anymore. Startups are exploring non-invasive BCI for focus enhancement, gaming, and interacting with AR environments. The ultimate peripheral. 🧠🎮 #BCI #TechTrends",
    media: ["https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&q=80&w=1200"]
  }
];

async function seedRichPosts() {
  try {
    console.log('🌱 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected.');

    // Fetch existing users to use as authors
    const users = await User.find({}).limit(50);
    if (users.length === 0) {
      console.error('No users found in the database. Run the main seed script first.');
      process.exit(1);
    }

    console.log(`📝 Inserting ${NEW_POSTS.length} high-quality rich posts...`);
    
    let count = 0;
    for (const postData of NEW_POSTS) {
      const author = faker.helpers.arrayElement(users);
      
      const likeCount = faker.number.int({ min: 10, max: 150 });
      const likes = Array.from({ length: Math.min(likeCount, users.length) }).map(() => ({
        userId: faker.helpers.arrayElement(users)._id.toString(),
        likedAt: faker.date.recent({ days: 3 })
      }));

      const commentCount = faker.number.int({ min: 2, max: 20 });
      const comments = Array.from({ length: commentCount }).map(() => {
        const commenter = faker.helpers.arrayElement(users);
        return {
          commentId: new mongoose.Types.ObjectId().toString(),
          authorId: commenter._id.toString(),
          authorName: commenter.name,
          content: faker.helpers.arrayElement([
            'Completely agree with this!',
            'Insightful read. Thanks for sharing.',
            'This is exactly what the industry needs right now.',
            'Can you share more details or the source?',
            'Fascinating perspective.',
            'I have a different take, but this is a great point.',
            'Amazing!',
            'This blew my mind 🤯',
            'Following this trend closely.',
            faker.lorem.sentence()
          ]),
          createdAt: faker.date.recent({ days: 3 })
        };
      });

      const newPost = new Post({
        authorId: author._id.toString(),
        authorName: author.name,
        authorAvatar: author.profile?.profilePhoto || faker.image.avatar(),
        content: postData.content,
        media: postData.media,
        type: 'text',
        likes: likes,
        likeCount: likes.length,
        comments: comments,
        commentCount: comments.length,
        createdAt: faker.date.recent({ days: 5 }) // Make them recent
      });

      await newPost.save();
      count++;
    }

    console.log(`✨ Successfully added ${count} rich posts!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding posts:', error);
    process.exit(1);
  }
}

seedRichPosts();

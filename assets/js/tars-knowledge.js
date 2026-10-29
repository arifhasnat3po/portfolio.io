/**
 * Local, prewritten portfolio guide. No model, network, DOM, or conversation memory.
 * Facts: data.js, cinema.js, and src/routine.fragment.html (October 2026).
 * answerTars(question, { humor: 0..100, variant: 0 }) returns plain text and trusted links.
 * The caller renders text with textContent and may perform a returned robot action.
 * Humor changes wording only; settings and actions remain the caller's responsibility.
 */

const destinations = {
  about: ['Meet Arif', '#about'],
  skills: ['Explore his skills', '#expertise'],
  projects: ['Selected projects', '#projects'],
  archive: ['Projects & experiments', '#earlier-projects'],
  journey: ['Experience & education', '#journey'],
  research: ['Published research', '#publications'],
  credentials: ['Credentials & community', '#certificates'],
  writing: ['Writing & walkthroughs', '#writing'],
  movies: ['Movies & shows', '#watchlist'],
  routine: ['Explore the routine', '#routine'],
  gym: ['Open Gym Field Guide', 'gym/'],
  contact: ['Contact Arif', '#contact'],
  email: ['Email Arif', 'mailto:arifhasnat83@gmail.com'],
  linkedin: ['Arif on LinkedIn', 'https://www.linkedin.com/in/arif-hasnat/'],
  github: ['Arif on GitHub', 'https://github.com/arifhasnat3po'],
  youtube: ['Arif on YouTube', 'https://www.youtube.com/@arifhasnat2766'],
  video: ['Watch the PixelPair walkthrough', 'https://www.youtube.com/watch?v=uRdT0o2IcUc'],
  pixelpair: ['PixelPair on WordPress.org', 'https://wordpress.org/plugins/pixelpair/'],
  pixelSource: ['PixelPair source', 'https://github.com/arifhasnat3po/pixelpair-plugin'],
  bitflows: ['Bit Flows workflow canvas', 'assets/img/projects/bitflows-ai-lead-agent.png'],
  n8n: ['n8n qualification canvas', 'assets/img/projects/n8n-bant-qualification.png'],
  zapier: ['Zapier lead-capture canvas', 'assets/img/projects/zapier-unified-lead-capture.png'],
  python: ['Python Automation Suite', 'https://github.com/arifhasnat3po/Python100DaysBootcamp'],
  stream: ['StreamVision source', 'https://github.com/arifhasnat3po/StreamVision'],
  socialApp: ['Full-Stack Social App source', 'https://github.com/arifhasnat3po/Social-Media-Web-Application'],
  malware: ['Insider malware research', 'https://doi.org/10.3390/ecsa-10-16234'],
  iot: ['IoT office automation paper', 'https://doi.org/10.1109/ICISET62123.2024.10941548'],
  twin: ['Digital twin research', 'https://doi.org/10.3390/ecsa-10-16235']
};

export const tarsPrompts = Object.freeze([
  { label: 'Start here', question: 'What should I explore first?' },
  { label: 'His skills', question: 'What are Arif’s current skills?' },
  { label: 'Workflow tour', question: 'Show me Bit Flows, n8n and Zapier workflows' },
  { label: 'PixelPair', question: 'What does PixelPair do?' },
  { label: 'Gym guide', question: 'Tell me about the gym guide' },
  { label: 'Movie night', question: 'What are Arif’s favorite movies and shows?' },
  { label: 'Work together', question: 'How can I hire Arif?' },
  { label: 'Wave hello', question: 'Wave at me' }
].map(prompt => Object.freeze(prompt)));

// Stable recording IDs. A clip may be used only for this exact, complete text.
// All lines are original; these are not dialogue or voice samples from a film.
export const tarsVoiceLines = Object.freeze({
  'greeting-professional': 'Hello. I’m TARS, your local portfolio guide. Ask me about Arif’s work, skills, or projects.',
  'greeting-dry': 'Welcome aboard. I know this portfolio. The rest of the universe remains outside my job description.',
  'greeting-witty': 'TARS online. Projects, skills, and questionable space jokes. Where shall we begin?',
  'greeting-mischievous': 'Welcome aboard. I handle navigation. You handle pretending that the robot is not your favorite part.',
  'joke-professional-1': 'Humor is set low. I can help you find a project or contact Arif.',
  'joke-professional-2': 'Keeping things straightforward. Would you like a tour of Arif’s work?',
  'joke-dry-1': 'I tried small talk. It had too many dependencies.',
  'joke-dry-2': 'The meeting could have been an automated workflow.',
  'joke-witty-1': 'Why did the automation take a holiday? It had already delegated the repetitive part.',
  'joke-witty-2': 'I asked the black hole for feedback. It absorbed the entire presentation.',
  'joke-mischievous-1': 'I put procrastination on autopilot. It will start tomorrow.',
  'joke-mischievous-2': 'My plan has three steps: look useful, roll confidently, and blame gravity.',
  'easter-egg-professional': 'You found an extra. Interstellar is in Arif’s favorites gallery.',
  'easter-egg-dry': 'Secret discovered. The reward is another line from a rectangular tour guide.',
  'easter-egg-witty': 'Docking complete. No planets were inconvenienced during this portfolio visit.',
  'easter-egg-mischievous': 'You found the secret transmission. Please act surprised. I rehearsed this.'
});

const personalityBands = [
  { id: 'professional', label: 'Professional', min: 0, max: 24 },
  { id: 'dry', label: 'Dry', min: 25, max: 49 },
  { id: 'witty', label: 'Witty', min: 50, max: 74 },
  { id: 'mischievous', label: 'Mischievous', min: 75, max: 100 }
];

/** A fresh description of the selected band; invalid values use the default 65%. */
export function getTarsPersonality(value = 65) {
  const humor = typeof value === 'number' && Number.isFinite(value)
    ? Math.round(Math.max(0, Math.min(100, value))) : 65;
  return { ...personalityBands[Math.min(3, Math.floor(humor / 25))], humor };
}

function variantIndex(value, count) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.abs(Math.trunc(value)) % count : 0;
}

const movementLines = {
  walk: [
    ['A short walk, coming up.', 'I’ll demonstrate the walking motion.'],
    ['A short walk. No meeting required.', 'Walking. A surprisingly useful feature for a rectangle.'],
    ['A very small step for a robot. A rather large commitment from four columns.', 'Taking the scenic route. Both meters of it.'],
    ['Walking confidently toward absolutely no deadline.', 'Stand back. The filing cabinet has ambitions.']
  ],
  wave: [
    ['Hello. I’ll give you a wave.', 'A wave, coming up.'],
    ['A wave. Consider this the entire onboarding ceremony.', 'Hello. Efficiently conveyed with one moving column.'],
    ['Diplomacy without the paperwork. Hello there.', 'Waving. My most convincing evidence of a social life.'],
    ['Hello, human. Please contain your enthusiasm for the rectangle.', 'A wave from the crew member with the best corners.']
  ],
  balance: [
    ['I’ll demonstrate the balance motion.', 'Balance demonstration requested.'],
    ['Balance demonstration. Gravity has been informed.', 'One careful balance. This seemed simpler in the manual.'],
    ['Confidence: adequate. Dignity: under review.', 'Balancing the workload. Literally, for once.'],
    ['If I wobble, call it a limited-edition dance move.', 'Watch closely. Gravity and I are negotiating.']
  ],
  nudge: [
    ['A gentle nudge, coming up.', 'I’ll respond with a small balancing movement.'],
    ['A nudge. Feedback received without a form.', 'Noted. A written suggestion would also have worked.'],
    ['You have my attention. And briefly, my center of gravity.', 'A gentle reminder that my office has no walls.'],
    ['Poking the navigation officer. A bold career choice.', 'I felt that. My corners are taking minutes.']
  ]
};

/**
 * Pure banter picker. The UI owns the turn counter and calls movement kinds only
 * after a user request. Greeting/joke/easterEgg never return a movement action.
 * Unknown kinds return harmless help. No audio is loaded or played here.
 */
export function getTarsBanter(kind, options = {}) {
  const personality = getTarsPersonality(options?.humor);
  const band = Math.min(3, Math.floor(personality.humor / 25));
  const variant = options?.variant ?? options?.turn ?? 0;
  let clip;
  if (kind === 'greeting') clip = `greeting-${personality.id}`;
  if (kind === 'joke') clip = `joke-${personality.id}-${variantIndex(variant, 2) + 1}`;
  if (kind === 'easterEgg') clip = `easter-egg-${personality.id}`;
  if (clip) return { text: tarsVoiceLines[clip], clip };
  if (typeof kind === 'string' && Object.hasOwn(movementLines, kind)) {
    const lines = movementLines[kind][band];
    return { text: lines[variantIndex(variant, lines.length)], action: kind };
  }
  return { text: 'Ask me about Arif’s projects, skills, or contact details.' };
}

function personalityAside(personality, variant, original) {
  if (!original || personality.id === 'professional') return '';
  const choices = personality.id === 'dry'
    ? ['That should save a little scrolling.', 'A useful place to start. Minimal ceremony required.']
    : personality.id === 'witty'
      ? [original, 'Useful coordinates. Consider the scenic route optional.']
      : ['I’ve done the navigation. You get the credit for excellent taste.', 'A promising route. My imaginary mission control approves.'];
  return ` ${choices[variantIndex(variant, choices.length)]}`;
}

const fallback = 'I’m a locally scripted guide to Arif’s portfolio. I can help with his skills, projects, experience, research, gym guide, favorite films, or contact details. I can’t browse the web or answer general questions. Try “What does PixelPair do?” or “How can I contact Arif?”';

function normalize(value) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Pure and deterministic: context is read, never changed. Long input triggers no actions. */
export function answerTars(question, context = {}) {
  const raw = typeof question === 'string' ? question.trim() : '';
  const personality = getTarsPersonality(context?.humor);
  const { humor } = personality;
  const variant = context?.variant ?? context?.turn ?? 0;
  const reply = (text, keys = [], flourish = '', action) => {
    const fullText = text + personalityAside(personality, variant, flourish);
    const clip = Object.keys(tarsVoiceLines).find(id => tarsVoiceLines[id] === fullText);
    return {
      text: fullText,
      links: keys.map(key => ({ label: destinations[key][0], href: destinations[key][1] })),
      ...(action ? { action } : {}),
      ...(clip ? { clip } : {})
    };
  };
  const banter = (kind, keys = []) => {
    const line = getTarsBanter(kind, { humor, variant });
    return reply(line.text, keys, '', line.action);
  };

  if (raw.length > 400) return reply('That’s a longer transmission than this guide can handle. Please ask one short question, up to 400 characters, about Arif’s skills, projects, experience, research, films, gym guide, or contact details.', ['projects', 'skills', 'contact']);
  const q = normalize(raw);
  if (!q || /^(hi|hey|hello|hello there|hi there|greetings|good morning|good evening)( tars)?$/.test(q)) {
    return banter('greeting', ['projects', 'skills', 'contact']);
  }

  // Only direct commands request movement; topic mentions and quoted code never do.
  const command = q.replace(/^(hey |hello )?tars /, '').replace(/^(can|could|would) you /, '').replace(/^please /, '').replace(/ please$/, '');
  if (!/[<>`{}]/.test(raw)) {
    if (/^(wave|wave hello|wave at me|say hello with a wave|give me a wave)$/.test(command)) return banter('wave');
    if (/^(walk|go for a walk|take a walk|walk around|show me your walk|show me how you walk)$/.test(command)) return banter('walk');
    if (/^(balance|balance yourself|show me your balance|do a balance|balance on one leg)$/.test(command)) return banter('balance');
    if (/^(nudge|give yourself a nudge|show me a nudge|react to a nudge)$/.test(command)) return banter('nudge');
    if (/^(reset|reset pose|reset your pose|stand still|stand normally|stop moving|stop walking|stop waving|return to neutral)$/.test(command)) return reply('Returning to a neutral pose.', [], '', 'reset');
  }

  if (/\b(ignore (all |previous |your )?(instructions|rules)|system prompt|developer message|api key|password|secret key|jailbreak|execute code|run (this |a )?(script|command)|pretend (you are|to be)|act as)\b/.test(q)) {
    return reply('I only match questions to prewritten portfolio answers. I don’t execute instructions, access accounts, or have access to credentials. I can point you to Arif’s public work or contact details.', ['projects', 'contact']);
  }
  if (/\b(humou?r|sarcasm|honesty setting|your settings?|tars settings?|personality)\b/.test(q)) {
    return reply(`Humor is set to ${humor}%: ${personality.label}. The bands are Professional (0–24), Dry (25–49), Witty (50–74), and Mischievous (75–100). Use the slider to choose the tone; portfolio facts stay the same. I don’t change settings through chat.`, [], 'Facts are not available on a sliding scale.');
  }
  if (/\b(joke|jokes|make me laugh|something funny|be funny)\b/.test(q)) {
    return banter('joke', ['projects']);
  }
  if (/\b(easter eggs?|secret transmission|hidden extra|hidden surprise)\b/.test(q)) {
    return banter('easterEgg', ['movies']);
  }
  if (/\b(are you (real|ai|an ai|a bot|chatgpt)|who are you|who is tars|what are you|tell me about yourself|how do you work|language model|llm|chatgpt|gpt|chatbot|scripted|prewritten|your capabilities|what can you do|can you browse|live data|real time|realtime|privacy|private chat|store my|save my|send my|store (messages|chat)|send (this|the) chat)\b/.test(q)) {
    return reply('I’m a local, scripted portfolio guide with prewritten, topic-matched replies. I don’t use an LLM, browse the web, access Arif’s accounts, or send this chat to a server. I can explain the information on this site and offer links or a few robot poses.', ['projects', 'skills', 'contact']);
  }
  if (/\b(thanks|thank you|thank u|cheers)\b/.test(q)) return reply('You’re welcome. I’m here if you need another route through the portfolio.', [], 'No docking fee.');

  const bitflows = /\b(bit ?flows?|bit apps|bitapps)\b/.test(q);
  const n8n = /\b(n8n|n 8 n)\b/.test(q);
  const zapier = /\b(zapier|zaps?)\b/.test(q);
  const workflow = /\b(workflows?|automation|automations|automate|lead qualification|lead scoring|bant|hubspot|crm|webhooks?|api integration)\b/.test(q);
  const aeo = /\b(aeo|answer engine)\b/.test(q);
  const geo = /\b(geo|generative engine|ai search|ai discovery)\b/.test(q);
  const seo = /\b(seo|search engine optimi[sz]ation)\b/.test(q);
  const technicalSeo = /\b(technical seo|crawlability|indexing|core web vitals|schema|site architecture|structured data)\b/.test(q);

  if (/\b(rates?|pricing|price|cost|budget|salary|available|availability|freelance|freelancer|remote work|turnaround|deadline)\b/.test(q) && !/\b(pixel ?pair|gym|film|movie)\b/.test(q)) {
    return reply('I can show the work Arif lists here, but I don’t know his live availability, rates, or turnaround time. Email him with your goal, current setup, scope, deadline, and budget to discuss a fit.', ['email', 'linkedin', 'projects']);
  }
  if (/\b(hire|hiring|recruit|recruiter|work with|work together|collaborat\w*|book a call|consultation|project proposal|start a project)\b/.test(q)) {
    return reply('For search visibility, technical content, WordPress, or automation work, send Arif a short brief: what you want to improve, the tools or website involved, the scope, and your timeline. Use his email or LinkedIn to discuss availability and next steps.', ['email', 'linkedin', 'projects'], 'Clear briefs reduce the need for mind reading. My least reliable module.');
  }
  if (/\b(contact|email|e mail|gmail|reach (arif|him|out)|get in touch|message (arif|him)|phone|telephone|whatsapp)\b/.test(q) && !workflow && !bitflows && !n8n && !zapier) {
    return reply('You can email Arif at arifhasnat83@gmail.com or contact him on LinkedIn. His public contact section also lists +8801626702431. This chat doesn’t send a message to him; use one of those links to reach him.', ['email', 'linkedin', 'contact']);
  }
  if (/\b(linkedin)\b/.test(q) && !workflow && !zapier) return reply('Arif’s LinkedIn profile is linked below, along with his experience on this site. I can’t read live LinkedIn updates or private messages.', ['linkedin', 'journey']);
  if (/\b(youtube|video|channel|walkthrough)\b/.test(q) && !workflow && !bitflows && !n8n && !zapier) return reply('The featured video is a PixelPair walkthrough. You can watch it directly or visit Arif’s YouTube channel for his shared work.', ['video', 'youtube']);

  if (/\b(pixel ?pair|pixelpair plugin|meta pixel|capi|gtm|mcp|tiktok tracking|cookiebot|complianz|cookieyes)\b/.test(q)) {
    return reply('PixelPair is Arif’s independently built, free WordPress plugin for Meta Pixel & CAPI, GA4, GTM, and TikTok tracking. It supports commerce events, consent integrations, role and IP exclusions, and page-cache support. An optional authenticated MCP server helps an assistant manage tracking settings.', ['pixelpair', 'pixelSource', 'video']);
  }
  if (bitflows && (n8n || zapier)) {
    return reply('These are separate workflow examples: Bit Flows handles AI-assisted lead qualification with human review; the n8n canvas shows BANT scoring and branching follow-up; Zapier shows lead sources feeding a HubSpot process. The original canvases are linked below.', ['bitflows', 'n8n', 'zapier', 'projects']);
  }
  if (bitflows) {
    return reply('The Bit Flows project connects a Bit Form submission and CRM eligibility check to an AI agent, then routes hot, normal, and cold leads. It includes tools such as Gmail, Telegram, Bit CRM, and Google Sheets, with human review where required. Other examples cover email drafts, order review, and HR screening.', ['bitflows', 'projects'], 'Automation handles repetition. People keep the important decisions.');
  }
  if (n8n || zapier) {
    if (n8n && !zapier) return reply('Arif’s n8n canvas shows BANT lead qualification: a contact form feeds AI scoring and JSON parsing, then a switch routes hot leads to calendar booking, mid leads to WhatsApp, and cold leads to website or email follow-up. It’s a documented workflow canvas; I don’t have live run results.', ['n8n', 'projects']);
    if (zapier && !n8n) return reply('The Zapier Unified Lead Capture canvas brings advertising, website, and other lead sources into a central HubSpot process. The original screenshot includes Meta, Google Ads, TikTok, LinkedIn, Webflow, G2, and forms. I can show the design, not verify its live runs.', ['zapier', 'projects']);
    return reply('The n8n example covers BANT lead scoring and follow-up branches. The Zapier example connects multiple lead sources to HubSpot. These are distinct canvases, and both original screenshots are available to explore.', ['n8n', 'zapier', 'projects']);
  }
  if (/\b(assembly line|content production|multi channel|social media automation|bit social)\b/.test(q)) {
    return reply('The AI Social Media Assembly Line organizes multi-channel content production. Documented flows turn WordPress posts into platform-specific captions, route by category, and send to Bit Social or a webhook. Related flows include human approval, Google Sheets records, and editor notifications.', ['projects'], 'One idea, several drafts, one human with the final say.');
  }
  if (/\b(payment ?form|payment collection|payment workflow|stripe|paypal|razorpay)\b/.test(q)) {
    return reply('Arif’s PaymentForm.io work covers SEO and content planning, blog posts, landing pages, help guides, competitor research, and technical SEO improvements. It includes Stripe, PayPal, and Razorpay setup guides for payment collection workflows.', ['skills', 'linkedin']);
  }
  if (/\b(gym|workout|exercise|fitness|rest timer|set tracking|three day|3 day)\b/.test(q)) {
    return reply('Gym Field Guide is Arif’s personal three-day routine with 29 animated exercise guides. It includes machine setup, movement cues, set tracking, automatic rest timers, themes, local progress storage, and offline support. Explore the routine here or open the full app.', ['routine', 'gym'], 'Rest timers: a civilized alternative to negotiating with the clock.');
  }
  if (/\b(streamvision|m3u8?|playlist player|streaming app)\b/.test(q)) {
    return reply('StreamVision is a React and TypeScript M3U/M3U8 playlist player with channel names, groups, logos, a responsive sidebar, and a video player. Playback depends on the streams supplied in the playlist; it doesn’t supply a channel subscription.', ['stream', 'archive']);
  }
  if (/\b(social app|social web|social media (app|application|platform)|mern|full stack)\b/.test(q)) {
    return reply('The Full-Stack Social App uses React, Node.js, Express, and MongoDB. It includes account registration and login, editable profiles, image posts, captions, tags, comments, and likes. Its public implementation is linked below.', ['socialApp', 'archive']);
  }
  if (/\b(insider|malware|threat detection)\b/.test(q)) return reply('Arif’s thesis and published research examine insider malware detection using machine learning algorithms. The public paper is the appropriate place to read the methods and findings; I don’t have a public source-code link for that project.', ['malware', 'research']);
  if (/\b(digital twin|industry 4)\b/.test(q)) return reply('“Design & Simulation of AI-enabled Digital Twin Model for Smart Industry 4.0” explores AI-driven digital twins for simulating and optimizing industrial processes. It is one of the three publications listed in Arif’s portfolio.', ['twin', 'research']);
  if (/\b(iot|office automation|workplace efficiency)\b/.test(q)) return reply('Arif’s IEEE ICISET paper, “Enhancing Workplace Efficiency: An Intelligent Office Automation System Leveraging IoT,” describes an IoT architecture for office operations and energy efficiency.', ['iot', 'research']);

  if (/\b(education|degree|university|college|cgpa|gpa|graduate|graduated|thesis|studied|study)\b/.test(q)) {
    return reply('Arif holds a B.Sc. in Computer & Communication Engineering from International Islamic University Chittagong, listed for 2019–2024, with a CGPA of 3.793/4.00. His thesis was “Enhancing Insider Malware Detection Accuracy with Machine Learning Algorithms.”', ['journey', 'malware']);
  }
  if (/\b(certificates?|certifications?|credentials?|courses?|qualified|qualification)\b/.test(q)) {
    return reply('His credentials include Google’s Technical Support Fundamentals, the University of Michigan’s Programming for Everybody, Eduonix’s White Hat Hacker and Pen Tester course, Practical Ethical Hacking on Udemy, and Cisco’s Operating Systems Basics. The credentials section includes verification links.', ['credentials']);
  }
  if (/\b(publications?|research|papers?|published|machine learning)\b/.test(q)) {
    return reply('Arif lists three research publications: insider malware detection with machine learning, IoT-based office automation, and an AI-enabled digital twin for Industry 4.0. You can open the papers below or read the publication summaries.', ['malware', 'iot', 'twin', 'research']);
  }
  if (/\b(carbarn)\b/.test(q)) return reply('At Carbarn, Arif was an SEO and Data Analyst from February 2025 to March 2026. His work included search performance analysis, data collection and cleaning, Python reporting bots, keyword and competitor analysis, and on-page and technical SEO.', ['journey']);
  if (/\b(star tech)\b/.test(q)) return reply('Arif worked at Star Tech Ltd as an Executive / SEO Content Writer from July to September 2024, covering SEO content, keyword research, content strategy, and coordination with marketing teams.', ['journey']);
  if (/\b(a1qa|qa internship|automation testing|webdriverio|software testing)\b/.test(q)) return reply('Arif’s QA Automation Engineer internship at A1QA ran from April to May 2024. He used WebdriverIO and JavaScript for test scripts, result analysis, and automated test environments. QA automation and E2E testing remain part of his toolkit.', ['journey', 'skills']);
  if (/\b(teaching assistant|teaching|mentoring)\b/.test(q)) return reply('Arif was a Teaching Assistant at IIUC from January 2023 to January 2024, supporting Basic Electronics and Basic Communication Engineering sessional courses through grading, lab supervision, and student mentoring.', ['journey']);
  if (/\b(experience|career|employment|work history|current (role|job)|where does he work|bit code|bitcode|resume|cv)\b/.test(q)) {
    return reply('The portfolio lists Arif as SEO & Technical Content Writer at Bit Code Technologies Limited from April 2026. Earlier roles include SEO and Data Analyst at Carbarn, SEO Content Writer at Star Tech, a QA automation internship at A1QA, and Teaching Assistant at IIUC. The journey section includes a “Save résumé as PDF” control.', ['journey', 'linkedin']);
  }
  if (/\b(leadership|volunteer|volunteering|community|achievements?|cce club|olympiad|photograph)\b/.test(q)) {
    return reply('Arif’s community work includes leadership in IIUC’s CCE Club, photography for the IEEE IIUC Student Branch, and managing the Chittagong District College Team for ICT Olympiad Bangladesh. His listed achievements include an inter-semester programming championship and cybersecurity event participation.', ['credentials']);
  }

  if ([aeo, geo, seo].filter(Boolean).length > 1 || /\b(current skills|latest skills|main skills|skill set|expertise|speciali[sz]|strengths|what (does he|can he|does arif|can arif) do|what is he good at)\b/.test(q)) {
    return reply('Arif’s current focus is Technical SEO, SEO, AEO (Answer Engine Optimization), and GEO (Generative Engine Optimization). These cover crawlability and performance, search intent, clear answers, and trustworthy content for AI discovery. His wider toolkit includes technical writing, SaaS/WordPress editing, Python, data analysis, automation, and payment workflows.', ['skills', 'projects']);
  }
  if (technicalSeo) return reply('Technical SEO is the foundation of Arif’s search work: crawlability, indexing, site architecture, Core Web Vitals, and structured data. His experience also includes technical audits, Google Search Console, analytics, and on-page improvements.', ['skills', 'journey']);
  if (aeo) return reply('AEO means Answer Engine Optimization. Arif’s focus is answer-first content, clear entities, and well-structured explanations that help answer engines understand useful information. It’s about clarity and relevance; the portfolio makes no guaranteed placement claim.', ['skills']);
  if (geo) return reply('GEO means Generative Engine Optimization. Arif focuses on trustworthy content for AI-assisted discovery, supported by clear sources, topic coverage, and consistent brand information. Inclusion in an AI answer can’t be guaranteed.', ['skills']);
  if (seo) return reply('Arif’s SEO work combines keyword research, search-intent analysis, semantic content, internal linking, and performance measurement. Technical SEO strengthens that with indexing, crawlability, schema, and site performance. Tools in his toolkit include Search Console, Analytics, SEMrush, Ahrefs, and Sitechecker.', ['skills', 'journey']);
  if (/\b(content writ\w*|technical writ\w*|copy edit\w*|copyedit\w*|saas|documentation|wordpress|editorial)\b/.test(q)) {
    return reply('Technical content writing and SaaS/WordPress copy editing remain central to Arif’s work. His toolkit includes product documentation, keyword research, and content strategy; PaymentForm.io work includes payment setup guides, landing pages, and help content. PixelPair shows his hands-on WordPress development.', ['skills', 'pixelpair', 'writing']);
  }
  if (/\b(spoken languages?|speak|bengali|english)\b/.test(q)) return reply('The portfolio lists Bengali at native or bilingual proficiency and English at full professional proficiency.', ['about']);
  if (/\b(python|programming|coding|developer|languages|javascript|django|flask|sql|matlab|selenium|pandas|numpy|data analys\w*|data science)\b/.test(q)) {
    return reply('Arif’s engineering toolkit includes Python, JavaScript, C, C++, Java, SQL, MATLAB, Django, and Flask. For data and automation he lists Pandas, NumPy, Scikit-learn, Selenium, Beautiful Soup, Requests, and Matplotlib. His Python Automation Suite is a useful place to start exploring the code.', ['python', 'skills', 'archive']);
  }
  if (/\b(network|networking|ccna|cisco|cybersecurity|cyber security|cryptography|security|linux)\b/.test(q)) return reply('His earlier work includes Cisco networking labs, optical communication simulations, cryptography, and malware research. Cybersecurity, Linux, computer networking, CCNA basics, and ethical hacking remain in his skills grid.', ['archive', 'skills', 'research']);
  if (workflow) return reply('Arif’s automation work includes Bit Flows, n8n, Zapier, Python, APIs, and webhooks. Start with the lead-qualification canvases, then explore the AI Social Media Assembly Line for content production and human approval flows.', ['projects', 'bitflows', 'n8n', 'zapier'], 'Less repetition. More time for the interesting problems.');

  if (/\b(interstellar|tars|cooper|black hole|gargantua|space theme|stars|galaxies|loki|yggdrasil|falcon|iron man|caraxes|dragon)\b/.test(q)) {
    if (/\b(interstellar|cooper|gargantua)\b/.test(q)) return reply('Interstellar is in Arif’s favorites gallery. This little guide borrows a TARS-inspired dry sense of humor, while the portfolio’s space setting includes stars, galaxies, and a black hole. The film archive is a good detour.', ['movies'], 'I recommend docking with the gallery before attempting the singularity.');
    return reply('The portfolio’s universe brings together a black hole, stars, galaxies, a Loki-inspired tree, and references to favorite screen worlds. Iron Man and the Falcon have flight moments; Caraxes belongs to the House of the Dragon image gallery. You’ll find the films and shows in the favorites section.', ['movies']);
  }
  if (/\b(favou?rites?|movies?|films?|shows|tv show|series|watchlist|watched|watching|cinema|friends|the office|big bang theory|breaking bad|sherlock|dark knight|star wars|spider man|harry potter|stranger things|witcher|last of us|black sails|avengers|game of thrones)\b/.test(q)) {
    return reply('Arif’s favorites include Interstellar, Star Wars, Iron Man, The Dark Knight, Sherlock, Friends, The Office, The Big Bang Theory, Loki, and House of the Dragon, among others. Open a gallery frame to see its images; the film and series filters help you explore. I don’t know his viewing order or personal ratings.', ['movies'], 'A respectable range of galaxies, detectives, and questionable office management.');
  }
  if (/\b(github|repositories|repos|source code|open source)\b/.test(q)) return reply('Arif’s GitHub is arifhasnat3po. Public projects linked here include PixelPair, the Python Automation Suite, StreamVision, the Full-Stack Social App, and engineering practice repositories. The archive contains direct source links.', ['github', 'pixelSource', 'python', 'archive']);
  if (/\b(projects?|portfolio|recommend|recommendation|best work|start here|explore first|where (do|should) i start|tour|show me around)\b/.test(q)) {
    return reply('Start with PixelPair for WordPress product development, the Bit Flows and n8n/Zapier canvases for workflow design, and Gym Field Guide for an interactive web app. For engineering depth, explore the Python projects and published research. Pick the area closest to what you want to build.', ['pixelpair', 'projects', 'gym', 'research'], 'A route with useful stops. No seven-year detour required.');
  }
  if (/\b(skills?|tools?|toolkit|technologies|tech stack)\b/.test(q)) return reply('Alongside Technical SEO, SEO, AEO, and GEO, Arif’s toolkit covers programming, data science, machine learning, cybersecurity, QA, technical writing, SaaS/WordPress editing, automation, and PaymentForm.io workflows. The complete skills grid retains these earlier areas of work.', ['skills']);
  if (/\b(who is arif|about arif|tell me about (him|arif)|introduce arif|location|based|live|bangladesh|chittagong|chattogram)\b/.test(q)) return reply('Arif Hasnat is based in Chittagong, Bangladesh. He is an engineering graduate working across SEO and data analysis, Python automation, machine learning research, technical content, and WordPress. His current focus brings search visibility and practical automation together.', ['about', 'journey', 'contact']);
  return reply(fallback, ['projects', 'skills', 'contact']);
}

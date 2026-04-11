import daBoiAvatar from "../client/static/da-boi.webp";
import kivo from "../client/static/examples/kivo.webp";
import messync from "../client/static/examples/messync.webp";
import microinfluencerClub from "../client/static/examples/microinfluencers.webp";
import promptpanda from "../client/static/examples/promptpanda.webp";
import reviewradar from "../client/static/examples/reviewradar.webp";
import scribeist from "../client/static/examples/scribeist.webp";
import searchcraft from "../client/static/examples/searchcraft.webp";
import { BlogUrl, DocsUrl } from "../shared/common";
import type { GridFeature } from "./components/FeaturesGrid";

export const features: GridFeature[] = [
  {
    name: "Your Personal AI Agent",
    description:
      "Every customer gets their own dedicated cloud-based agent. Fully yours, fully managed — no technical setup required.",
    emoji: "🤖",
    href: DocsUrl,
    size: "small",
  },
  {
    name: "Instant Activation",
    description:
      "Your Amigo agent is automatically provisioned upon successful payment. No waiting, no manual configuration — just your AI, ready to go.",
    emoji: "⚡",
    href: DocsUrl,
    size: "small",
  },
  {
    name: "Pre-built Skills & Templates",
    description:
      "Each agent comes bundled with built-in AI skills and prompt templates, so you can start being productive from day one.",
    emoji: "🧠",
    href: DocsUrl,
    size: "medium",
  },
  {
    name: "Cutting-Edge AI Models",
    description:
      "Powered by the latest AI models, Amigo delivers intelligent, context-aware responses for any task you throw at it.",
    emoji: "🚀",
    href: DocsUrl,
    size: "large",
  },
  {
    name: "Secure & Isolated Cloud",
    description:
      "Your agent runs in a fully isolated cloud environment. Your data, conversations, and configurations are never shared with other users.",
    emoji: "🔐",
    href: DocsUrl,
    size: "large",
  },
  {
    name: "Scalable Ecosystem",
    description:
      "Built to grow beyond a single agent. As the platform matures, new agent types and capabilities will be added to the ecosystem.",
    emoji: "📈",
    href: DocsUrl,
    size: "small",
  },
  {
    name: "Consumer-First Design",
    description:
      "Designed for everyone — not just developers. If you can use a smartphone, you can use Amigo. No technical background needed.",
    emoji: "👤",
    href: DocsUrl,
    size: "small",
  },
  {
    name: "Fully Managed Infrastructure",
    description:
      "Own your agent without managing any backend complexity. Amigo handles all the cloud infrastructure so you can focus on getting things done.",
    emoji: "☁️",
    href: DocsUrl,
    size: "medium",
  },
  {
    name: "AI for Everyone",
    description:
      "Our mission is to democratize AI — making advanced intelligence a personal tool available to every individual, not just enterprises.",
    emoji: "🌍",
    href: DocsUrl,
    size: "medium",
  },
];

export const testimonials = [
  {
    name: "Emily W.",
    role: "Freelance Designer",
    avatarSrc: daBoiAvatar,
    socialUrl: "#",
    quote:
      "I'm not technical at all, but Amigo had my own AI assistant ready the moment I signed up. It's like having a smart helper that never sleeps.",
  },
  {
    name: "James K.",
    role: "Small Business Owner",
    avatarSrc: daBoiAvatar,
    socialUrl: "#",
    quote:
      "Amigo replaced hours of manual work every week. The built-in prompt templates are incredibly useful — I didn't have to learn anything new.",
  },
  {
    name: "Priya S.",
    role: "College Student",
    avatarSrc: daBoiAvatar,
    socialUrl: "#",
    quote:
      "Finally, an AI agent that's affordable and actually designed for regular people like me. It just works — no setup headaches, no coding.",
  },
  {
    name: "David L.",
    role: "Content Creator",
    avatarSrc: daBoiAvatar,
    socialUrl: "#",
    quote:
      "The instant provisioning blew me away. I paid, and my agent was there immediately. It's the most seamless AI experience I've ever had.",
  },
  {
    name: "Maria G.",
    role: "Marketing Manager",
    avatarSrc: daBoiAvatar,
    socialUrl: "#",
    quote:
      "We tried enterprise AI tools and they were too complex. Amigo gives us powerful AI capabilities without the learning curve. Highly recommended.",
  },
  {
    name: "Tom H.",
    role: "Retired Teacher",
    avatarSrc: daBoiAvatar,
    socialUrl: "#",
    quote:
      "I was skeptical about using AI, but Amigo made it so simple. My personal agent helps me with research, writing, and organizing my day. Wonderful product.",
  },
];

export const faqs = [
  {
    id: 1,
    question: "What is Amigo?",
    answer:
      "Amigo is a cloud-based Agent-as-a-Service (AaaS) platform that gives everyone their own personal AI agent. Upon purchase, your agent is automatically provisioned and ready to use immediately — no technical setup required.",
    href: DocsUrl,
  },
  {
    id: 2,
    question: "Do I need any technical knowledge to use Amigo?",
    answer:
      "Not at all. Amigo is designed for everyday consumers. If you can use a web browser, you can use Amigo. Your agent comes pre-configured with built-in skills and prompt templates.",
    href: DocsUrl,
  },
  {
    id: 3,
    question: "How quickly is my agent ready after purchase?",
    answer:
      "Instantly. Upon successful payment, Amigo automatically provisions your dedicated cloud-based agent. No waiting, no manual setup — it's ready to work for you immediately.",
    href: DocsUrl,
  },
  {
    id: 4,
    question: "What can my Amigo agent do?",
    answer:
      "Your Amigo agent comes with pre-built AI skills and prompt templates. It can help with research, writing, task management, data analysis, and much more. As the platform grows, new capabilities will be added.",
    href: DocsUrl,
  },
  {
    id: 5,
    question: "Is my data safe with Amigo?",
    answer:
      "Absolutely. Each customer's agent runs in a fully isolated cloud environment. Your data, conversations, and configurations are never shared with or accessible by other users.",
    href: DocsUrl,
  },
  {
    id: 6,
    question: "What AI models power Amigo?",
    answer:
      "Amigo is powered by cutting-edge AI models to deliver intelligent, context-aware responses. We continuously update our models to ensure you always have access to the best AI capabilities.",
    href: DocsUrl,
  },
];

export const footerNavigation = {
  app: [
    { name: "Documentation", href: DocsUrl },
    { name: "Blog", href: BlogUrl },
    { name: "Pricing", href: "/pricing" },
  ],
  company: [
    { name: "About", href: "#" },
    { name: "Privacy Policy", href: "#" },
    { name: "Terms of Service", href: "#" },
    { name: "Contact", href: "mailto:support@agentkm.com" },
  ],
};

export const examples = [
  {
    name: "Personal Research Assistant",
    description:
      "Ask your agent to research any topic and receive structured, well-organized summaries delivered in seconds.",
    imageSrc: kivo,
    href: "#",
  },
  {
    name: "Daily Task Planner",
    description:
      "Let Amigo break down your to-do list into actionable subtasks with priorities and time estimates.",
    imageSrc: messync,
    href: "#",
  },
  {
    name: "Content Writing Helper",
    description:
      "Generate blog posts, social media captions, emails, and more using built-in prompt templates tailored for your needs.",
    imageSrc: microinfluencerClub,
    href: "#",
  },
  {
    name: "Smart Document Analyzer",
    description:
      "Upload any document and let your agent extract key information, summarize content, and answer questions about it.",
    imageSrc: promptpanda,
    href: "#",
  },
  {
    name: "Learning Companion",
    description:
      "Get personalized explanations, study plans, and quiz generation to accelerate your learning on any subject.",
    imageSrc: reviewradar,
    href: "#",
  },
  {
    name: "Email & Communication Aid",
    description:
      "Draft professional emails, replies, and messages with AI-powered tone adjustment and language optimization.",
    imageSrc: scribeist,
    href: "#",
  },
  {
    name: "Idea Brainstorming Partner",
    description:
      "Collaborate with your AI agent to brainstorm ideas, explore creative solutions, and overcome mental blocks.",
    imageSrc: searchcraft,
    href: "#",
  },
];

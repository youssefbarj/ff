"use client"

import { useState, useEffect, useRef } from "react"
import { MessageSquare, AlertTriangle, ArrowRight, RefreshCcw, Star } from "lucide-react"

// --- DATA: SCENARIO & DIALOGUE ---

const SCENARIO_NODES = {
  start: {
    id: "start",
    npcText: "(La cliente entre dans l'institut. Elle regarde les rayons d'un air hésitant...)",
    options: [
      {
        text: "Attendre qu'elle vienne vers vous (Ne pas déranger)",
        scoreDelta: -20,
        feedback: "Dommage. Une attitude passive peut être perçue comme de l'indifférence. Vous devez briser la glace.",
        sentiment: "negative",
        nextNodeId: "node_2",
      },
      {
        text: "Bonjour ! Nos produits sont en promotion aujourd'hui !",
        scoreDelta: -10,
        feedback: "Trop agressif. Vous sautez l'étape de l'accueil et de la découverte pour vendre immédiatement.",
        sentiment: "neutral",
        nextNodeId: "node_2",
      },
      {
        text: "Bonjour Madame, en quoi puis-je vous aider ?",
        scoreDelta: +20,
        feedback: "Parfait. Sourire, salutation polie et prise en charge immédiate. Rapport neutre établi.",
        sentiment: "positive",
        nextNodeId: "node_2",
      },
    ],
  },
  node_2: {
    id: "node_2",
    npcText:
      "Bonjour... Je regarde juste... enfin, je cherche une crème de jour, mais je ne sais pas trop laquelle choisir.",
    options: [
      {
        text: "Prenez celle-ci, c'est notre best-seller, tout le monde l'adore.",
        scoreDelta: -20,
        feedback:
          "Erreur. Vous proposez une solution avant même de comprendre son besoin spécifique (Type de peau ? Problème ?).",
        sentiment: "negative",
        nextNodeId: "end_fail",
      },
      {
        text: "Quel type de peau avez-vous et qu'attendez-vous de votre crème ?",
        scoreDelta: +20,
        feedback: "Excellent. C'est la phase de Découverte. Vous posez une question ouverte pour cibler le besoin.",
        sentiment: "positive",
        nextNodeId: "node_3",
      },
    ],
  },
  node_3: {
    id: "node_3",
    npcText: "J'ai la peau très sèche et qui tire, surtout l'hiver. Je veux quelque chose de très riche.",
    options: [
      {
        text: "Je vois. Voici la crème 'Hydra-Intense'. Elle est riche en karité, parfaite pour nourrir et apaiser.",
        scoreDelta: +20,
        feedback:
          "Parfait. Vous reformulez implicitement ('Je vois') et proposez un produit adapté aux besoins exprimés (peau sèche/riche).",
        sentiment: "positive",
        nextNodeId: "node_4",
      },
      {
        text: "D'accord. Avez-vous aussi pensé à un sérum anti-âge ?",
        scoreDelta: -10,
        feedback:
          "Attention, vous vous dispersez. Répondez d'abord à son besoin principal (crème riche) avant de proposer des compléments.",
        sentiment: "neutral",
        nextNodeId: "node_4",
      },
    ],
  },
  node_4: {
    id: "node_4",
    npcText: "(Elle regarde le prix) C'est un peu cher quand même...",
    options: [
      {
        text: "C'est vrai, mais la qualité a un prix.",
        scoreDelta: -10,
        feedback: "Un peu sec. Essayez plutôt de justifier le prix par les bénéfices ou la durée d'utilisation.",
        sentiment: "neutral",
        nextNodeId: "end_success",
      },
      {
        text: "Je comprends. Cependant, une petite noisette suffit, le pot dure 3 mois. C'est un investissement pour votre confort.",
        scoreDelta: +20,
        feedback: "Très bien ! Vous traitez l'objection 'prix' en valorisant la durée de vie et le bénéfice (confort).",
        sentiment: "positive",
        nextNodeId: "end_success",
      },
    ],
  },
  end_success: {
    id: "end_success",
    npcText: "Vous avez raison, je vais la prendre. Merci de vos conseils !",
    options: [],
  },
  end_fail: {
    id: "end_fail",
    npcText: "Je vais réfléchir... Merci. (La cliente part sans rien acheter)",
    options: [],
  },
}

// --- COMPONENTS ---

const ConfidenceMeter = ({ value }) => {
  // Determine color based on value
  let colorClass = "bg-green-500"
  if (value < 30) colorClass = "bg-red-500"
  else if (value < 60) colorClass = "bg-yellow-500"

  return (
    <div className="mb-6">
      <div className="flex justify-between text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
        <span>Méfiance</span>
        <span>Confiance</span>
      </div>
      <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full transition-all duration-500 ease-out ${colorClass}`} style={{ width: `${value}%` }} />
      </div>
      <div className="mt-1 text-right text-xs font-medium text-slate-700">Niveau de Confiance : {value}%</div>
    </div>
  )
}

const FeedbackCard = ({ feedback }) => {
  if (!feedback) return null

  const getStyle = () => {
    switch (feedback.sentiment) {
      case "negative":
        return "bg-red-900/30 border-red-500 text-red-200"
      case "positive":
        return "bg-green-900/30 border-green-500 text-green-200"
      default:
        return "bg-yellow-900/30 border-yellow-500 text-yellow-200"
    }
  }

  return (
    <div className={`mt-4 p-4 rounded-lg border-l-4 ${getStyle()} animate-fade-in`}>
      <div className="flex items-start gap-3">
        {feedback.sentiment === "negative" ? <AlertTriangle size={20} /> : <Star size={20} />}
        <p className="text-sm font-medium">{feedback.text}</p>
      </div>
    </div>
  )
}

export default function SalesSimulator() {
  const [currentNodeId, setCurrentNodeId] = useState("start")
  const [confidenceScore, setConfidenceScore] = useState(50) // Start at 50%
  const [lastFeedback, setLastFeedback] = useState(null)
  const [chatHistory, setChatHistory] = useState([])

  const currentNode = SCENARIO_NODES[currentNodeId]
  const chatEndRef = useRef(null)

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatHistory, currentNode])

  const handleOptionClick = (option) => {
    // 1. Add user choice to history
    setChatHistory((prev) => [...prev, { type: "user", text: option.text }])

    // 2. Update confidence score
    setConfidenceScore((prev) => Math.min(100, Math.max(0, prev + option.scoreDelta)))

    // 3. Show feedback
    setLastFeedback({ text: option.feedback, sentiment: option.sentiment })

    // 4. Move to next node after a short delay for reading feedback
    if (option.nextNodeId) {
      setTimeout(() => {
        setCurrentNodeId(option.nextNodeId)
        setLastFeedback(null) // Clear feedback for next turn
      }, 3500) // 3.5s delay to read feedback
    }
  }

  const restartSimulation = () => {
    setCurrentNodeId("start")
    setConfidenceScore(50)
    setChatHistory([])
    setLastFeedback(null)
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F3F1FF] p-4">
      <div className="flex h-[90vh] max-w-7xl w-full bg-white text-slate-900 font-sans overflow-hidden rounded-2xl shadow-2xl">
        {/* LEFT SIDE: VISUAL CONTEXT */}
        <div className="w-1/3 relative hidden md:block">
          <img
            src="/images/image.png"
            alt="Mme. Dubois at Elysian Beauty Entrance"
            className="absolute inset-0 w-full h-full object-cover rounded-l-2xl"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/40 to-transparent"></div>
          <div className="absolute bottom-10 left-10 right-10">
            <h1 className="text-2xl font-bold text-slate-900 mb-1 drop-shadow-lg">Mme. Dubois</h1>
            <p className="text-slate-700 text-sm mb-4 drop-shadow-md">Cliente Nouvelle</p>
          </div>
        </div>

        {/* RIGHT SIDE: INTERACTIVE CHAT */}
        <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full bg-white rounded-r-2xl shadow-2xl">
          {/* Header / Stats */}
          <div className="p-6 border-b border-slate-200 bg-white z-10">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-slate-600 tracking-wider">--- NOUVELLE CLIENTE ---</h2>
              <button
                onClick={restartSimulation}
                className="flex items-center gap-2 text-xs text-slate-600 hover:text-slate-900 transition-colors"
              >
                <RefreshCcw size={14} /> Recommencer
              </button>
            </div>
            <ConfidenceMeter value={confidenceScore} />
          </div>

          {/* Chat Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
            {/* History */}
            {chatHistory.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] p-4 rounded-xl text-sm ${
                    msg.type === "user"
                      ? "bg-purple-600 text-white rounded-br-none"
                      : "bg-slate-100 text-slate-800 rounded-bl-none"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {/* Current NPC Message */}
            <div className="flex justify-start animate-fade-in-up">
              <div className="max-w-[80%] p-5 rounded-xl bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-600 uppercase tracking-widest">
                  <MessageSquare size={12} /> Cliente
                </div>
                {currentNode.npcText}
              </div>
            </div>

            {/* Feedback Display Area (Transient) */}
            {lastFeedback && (
              <div className="flex justify-center">
                <FeedbackCard feedback={lastFeedback} />
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Options / Controls */}
          <div className="p-6 bg-white border-t border-slate-200">
            {currentNode.options.length > 0 ? (
              <div className="grid gap-3">
                <p className="text-xs font-bold text-slate-500 uppercase mb-2">Votre Réponse :</p>
                {currentNode.options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleOptionClick(option)}
                    disabled={!!lastFeedback}
                    className="text-left p-4 rounded-lg bg-slate-50 hover:bg-purple-700 border border-slate-200 hover:border-purple-500 transition-all duration-200 flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="text-sm text-slate-700 group-hover:text-white">{option.text}</span>
                    <ArrowRight
                      size={16}
                      className="text-slate-500 group-hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <h3 className="text-xl font-bold text-slate-900 mb-2">Simulation Terminée</h3>
                <p className="text-slate-600 text-sm mb-4">
                  Score Final :{" "}
                  <span className={confidenceScore > 60 ? "text-green-600" : "text-red-600"}>{confidenceScore}%</span>
                </p>
                <button
                  onClick={restartSimulation}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-full font-medium transition-colors"
                >
                  Recommencer le scénario
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

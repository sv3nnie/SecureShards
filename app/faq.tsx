import React, { useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/20/solid";
import { MagnifyingGlassIcon } from "@heroicons/react/20/solid";

const faqData = [
  {
    question: "What is SecureShards?",
    answer:
      "SecureShards is a web application that allows users to split and recover secrets using a threshold-based secret sharing scheme. SecureShards uses the Shamir's Secret Sharing algorithm to split a secret into multiple parts called shards, which can be distributed among trusted individuals or stored in secure locations. Shards are end-to-end encrypted using a password provided by the user and can only be reconstructed with the correct password and a sufficient number of shards.",
  },
  {
    question: "How does SecureShards work?",
    answer:
      "SecureShards works by splitting a secret into multiple parts called shards using the Shamir's Secret Sharing algorithm. The user provides a secret, a password, the threshold number of shards required to reconstruct the secret, and the total number of shards to generate. The secret is encrypted using the password and split into shards, which can be downloaded as text, image, or PDF files. To recover the original secret, the user must provide the correct password and a sufficient number of shards to reconstruct the secret.",
  },
  {
    question: "How secure is SecureShards?",
    answer:
      "SecureShards is designed to be secure and private, with all encryption and decryption operations performed client-side in the user's browser. The secret is never sent to the server, ensuring that sensitive information remains confidential and protected. SecureShards uses end-to-end encryption to secure the secret and shards.",
  },
  {
    question: "Why would I use SecureShards?",
    answer:
      "SecureShards provides a secure and reliable way to split and recover secrets, ensuring that sensitive information is protected and accessible only to authorized individuals. Examples of use cases for SecureShards include securely storing passwords, encryption keys, recovery phrases, and other confidential data that needs to be safeguarded and shared among trusted parties.",
  },
  {
    question: "Why would I use this instead of a password manager, USB drive or cloud storage?",
    answer:
      "SecureShards offers an additional layer of security by splitting a secret into multiple parts and distributing them among trusted individuals. This reduces the risk of a single point of failure, such as losing access to a password manager, USB drive, or cloud storage account. SecureShards also provides a decentralized approach to secret sharing, allowing users to maintain control over their data and share it securely with others.",
  },
  {
    question: "What is the purpose of shard files?",
    answer:
      "Shard files contain encrypted fragments of the original secret that are generated using the Shamir's Secret Sharing algorithm and end-to-end encrypted with the password provided by the user. Shard files can be distributed among trusted individuals for safekeeping and used to reconstruct the original secret when combined with the correct password and a sufficient number of shards.",
  },
  {
    question: "How do I know if my password is correct?",
    answer:
      "If the recovery process is successful and you receive the correct secret, then your password is correct. If the recovery process fails or returns an incorrect secret, you may need to verify your password and the shards used for recovery.",
  },
  {
    question: "What types of file formats are supported for shards?",
    answer: "SecureShards supports text, image, and PDF file formats for shards. Shards can be downloaded as text files (.txt), image files (.png), or PDF files (.pdf) for easy digital or printable storage.",
  },
  {
    question: "Can I share shard files with others?",
    answer:
      "Yes, you can share shard files with trusted individuals for safekeeping. Each shard file contains an encrypted fragment of the original secret and can be used to reconstruct the secret when combined with other shards and the correct password.",
  },
  {
    question: "What happens if I lose a shard file?",
    answer: "If you lose a shard file, you may still be able to recover the original secret if you have enough remaining shards, depending on the threshold set during the creation of the shards.",
  },
  {
    question: "What happens if I forget or lose the password?",
    answer:
      "If you forget or lose your password, you will not be able to recover the original secret from the shards. It is important to keep your password secure and accessible only to authorized individuals who may need to reconstruct the secret in the future.",
  },
  {
    question: "Can I change the password for my shards?",
    answer:
      "No, the password used to encrypt the shards cannot be changed. If you need to update the password, you will need to generate new shards with the new password and distribute them accordingly.",
  },
  {
    question: "Where should I store my shard files?",
    answer:
      "Shard files should be stored in multiple secure locations. You can distribute the shard files among trusted individuals, store them in encrypted storage, or keep physical copies in secure locations to ensure that you can access them when needed. Make sure the shard files are not stored in areas that are prone to fire, water damage, or theft.",
  },
];

export default function FAQTab() {
  const [openQuestions, setOpenQuestions] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFAQExpanded, setIsFAQExpanded] = useState(false);

  const toggleQuestion = (index: number) => {
    setOpenQuestions((prevOpenQuestions) => (prevOpenQuestions.includes(index) ? prevOpenQuestions.filter((i) => i !== index) : [...prevOpenQuestions, index]));
  };

  const filteredFAQs = faqData.filter((faq) => {
    const searchTerm = searchQuery.toLowerCase();
    return (
      faq.question.toLowerCase().includes(searchTerm) ||
      faq.answer.toLowerCase().includes(searchTerm)
    );
  });

  return (
    <div className="flex flex-col items-center justify-center w-full mt-3 mb-3">
      <div className="bg-dark shadow-lg rounded-lg p-8 w-full">
        <div 
          className="flex justify-between items-center cursor-pointer"
          onClick={() => setIsFAQExpanded(!isFAQExpanded)}
        >
          <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
          {isFAQExpanded ? 
            <ChevronUpIcon className="h-6 w-6 text-blue-400" /> : 
            <ChevronDownIcon className="h-6 w-6 text-blue-400" />
          }
        </div>
        
        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isFAQExpanded ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0"}`}>
          <div className="relative mb-6 mt-6">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search FAQ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 text-gray-200 placeholder-gray-400"
            />
          </div>

          {filteredFAQs.length === 0 ? (
            <p className="text-center text-gray-400">No matching questions found</p>
          ) : (
            filteredFAQs.map((faq, index) => (
              <div key={index} className={`faq-item bg-dark-light p-4 mb-4 rounded-xl hover:bg-opacity-50 transition-all duration-300 ${openQuestions.includes(index) ? "open" : ""}`}>
                <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleQuestion(index)}>
                  <p className="font-semibold text-lg">{faq.question}</p>
                  {openQuestions.includes(index) ? <ChevronUpIcon className="h-5 w-5 text-blue-400" /> : <ChevronDownIcon className="h-5 w-5 text-blue-400" />}
                </div>
                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${openQuestions.includes(index) ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}`}>
                  <p className="mt-3 text-gray-300 leading-relaxed">{faq.answer}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

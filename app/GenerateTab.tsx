import React, { useState, useEffect } from "react";
import { splitString } from "./helpers/secureshards";
import { EyeIcon, EyeSlashIcon, DocumentDuplicateIcon, QrCodeIcon, InformationCircleIcon, ChevronUpIcon, ChevronDownIcon, ArrowPathIcon } from "@heroicons/react/20/solid";
import JSZip from "jszip";
import QRCode from "qrcode";

const presets = [
  { name: "Basic (2/3)", required: 2, total: 3 },
  { name: "Standard (3/5)", required: 3, total: 5 },
  { name: "Advanced (5/7)", required: 5, total: 7 },
  { name: "Custom", required: 1, total: 1 }
];

// Word list for password generation
const words = [
  "correct", "horse", "battery", "staple", "apple", "banana", "cherry", "dolphin",
  "elephant", "falcon", "giraffe", "hedgehog", "iguana", "jaguar", "kangaroo",
  "leopard", "monkey", "narwhal", "octopus", "penguin", "quokka", "rabbit",
  "snake", "tiger", "unicorn", "vulture", "walrus", "xenon", "yak", "zebra"
];

export default function GenerateTab() {
  const [secret, setSecret] = useState("");
  const [password, setPassword] = useState("");
  const [label, setLabel] = useState("");
  const [requiredShards, setRequiredShards] = useState(2);
  const [totalShards, setTotalShards] = useState(3);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [shards, setShards] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [exportFormats, setExportFormats] = useState(new Set<string>(["TXT"]));
  const [selectedPreset, setSelectedPreset] = useState("Basic (2/3)");
  const [showExplainer, setShowExplainer] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [currentStep, setCurrentStep] = useState(1);
  const [fieldErrors, setFieldErrors] = useState({
    secret: false,
    password: false
  });

  useEffect(() => {
    const hasVisitedBefore = localStorage.getItem('hasVisitedBefore');
    if (!hasVisitedBefore) {
      setShowExplainer(true);
      localStorage.setItem('hasVisitedBefore', 'true');
    }
  }, []);

  useEffect(() => {
    if (password) {
      // Calculate password strength based on multiple criteria
      let score = 0;
      
      // Length check
      if (password.length >= 12) score++;
      if (password.length >= 16) score++;
      
      // Character variety checks
      if (/[A-Z]/.test(password)) score++;
      if (/[a-z]/.test(password)) score++;
      if (/[0-9]/.test(password)) score++;
      if (/[^A-Za-z0-9]/.test(password)) score++;
      
      // Word pattern check (for generated passwords)
      if (/^[a-z]+-[a-z]+-[a-z]+-[a-z]+-\d{4}$/.test(password)) {
        score = 4; // Generated passwords are considered strong
      }
      
      // Normalize score to 0-4 range
      score = Math.min(4, Math.floor(score * 0.7));
      
      setPasswordStrength(score);
    } else {
      setPasswordStrength(0);
    }
  }, [password]);

  const generatePassword = () => {
    // Generate 4 random words and join with random numbers
    const selectedWords = Array.from({ length: 4 }, () => {
      const word = words[Math.floor(Math.random() * words.length)];
      return word.charAt(0).toUpperCase() + word.slice(1);
    });
    const randomNum = Math.floor(Math.random() * 9000) + 1000;
    const newPassword = selectedWords.join('-') + '-' + randomNum;
    setShowPassword(true);
    setPassword(newPassword);
  };

  const getPasswordStrengthColor = () => {
    const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-400', 'bg-green-500'];
    return colors[passwordStrength] || colors[0];
  };

  const handleFormatChange = (format: string) => {
    setExportFormats((prevFormats) => {
      const newFormats = new Set(prevFormats);
      if (newFormats.has(format)) {
        newFormats.delete(format);
      } else {
        newFormats.add(format);
      }
      return newFormats;
    });
  };

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    const selectedPreset = presets.find(p => p.name === preset);
    if (selectedPreset) {
      setRequiredShards(selectedPreset.required);
      setTotalShards(selectedPreset.total);
    }
  };

  const nextStep = () => {
    if (currentStep === 1) {
      // Reset field errors
      setFieldErrors({
        secret: !secret,
        password: !password
      });

      if (!secret || !password) {
        setErrorMessage("Please fill in all required fields.");
        return;
      }
    }
    if (currentStep === 2 && requiredShards > totalShards) {
      setErrorMessage("Required shards cannot be more than total shards");
      return;
    }
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
      setErrorMessage("");
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setErrorMessage("");
    }
  };

  const exportShards = async () => {
    const fileLabel = label || "shards";
    const zip = new JSZip();

    for (const format of exportFormats) {
      const formatFolder = zip.folder(format);

      if (format === "TXT") {
        shards.forEach((shard, index) => {
          formatFolder!.file(`${fileLabel}-${index + 1}-${Date.now()}.txt`, shard);
        });
      } else if (format === "PNG") {
        const qrPromises = shards.map((shard, index) => {
          return QRCode.toDataURL(shard).then((url: string) => {
            return { url, index };
          });
        });

        const qrCodes = await Promise.all(qrPromises);

        qrCodes.forEach(({ url, index }: { url: string; index: number }) => {
          const imgBlob = dataURLtoBlob(url);
          formatFolder!.file(`${fileLabel}-${index + 1}-${Date.now()}.png`, imgBlob);
        });
      }
    }

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileLabel}-${Date.now()}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const dataURLtoBlob = (dataURL: any) => {
    const arr = dataURL.split(",");
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const handleClick = async () => {
    if (!secret || !password) {
      setErrorMessage("Please check your inputs. Secret and password are required.");
      setSuccessMessage("");
      setShards([]);
      return;
    }

    if (requiredShards > totalShards) {
      setErrorMessage("Please check your inputs. Required shards should not be more than total shards.");
      setSuccessMessage("");
      setShards([]);
      return;
    }

    if (exportFormats.size === 0) {
      setErrorMessage("Please select at least one export format.");
      setSuccessMessage("");
      setShards([]);
      return;
    }

    try {
      const shares = await splitString(secret, totalShards, requiredShards, password);
      setShards(shares);

      setErrorMessage("");
      setSuccessMessage("Shards generated successfully. Export the shards to save them.");
    } catch (err) {
      setErrorMessage("An error occurred while generating shards.");
      setSuccessMessage("");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <div className="bg-dark shadow-2xl rounded-xl p-8 w-full backdrop-blur-sm bg-opacity-80">
        <div className="space-y-6">
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <button 
              onClick={() => setShowExplainer(!showExplainer)}
              className="flex items-center justify-between w-full text-lg font-semibold text-gray-200"
            >
              How It Works
              {showExplainer ? (
                <ChevronUpIcon className="h-5 w-5" />
              ) : (
                <ChevronDownIcon className="h-5 w-5" />
              )}
            </button>
            {showExplainer && (
              <div className="mt-4 text-gray-300 space-y-2">
                <p>SecureShards helps you protect sensitive information by splitting it into multiple encrypted pieces (shards). To recover your secret, you&apos;ll need both a specific number of shards and the password you set. Everything happens in your browser - your secret is never sent to any server.</p>
                <p className="text-sm text-gray-400">Real-world example: Store your crypto wallet recovery seed more securely by splitting it into 5 shards, requiring any 3 to recover. This way, even if someone finds one or two shards, your funds remain safe. You can give different shards to trusted family members and store others in secure locations like a bank vault - ensuring you never completely lose access while maintaining security.</p>
              </div>
            )}
          </div>

          {/* Steps indicator */}
          <div className="flex flex-col items-center space-y-2 mb-6">
            <div className="flex justify-center items-center space-x-3">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-lg flex flex-col items-center justify-center text-sm border ${
                    step === currentStep ? 'bg-indigo-600/90 text-white border-indigo-500' : 
                    step < currentStep ? 'bg-green-600/90 text-white border-green-500' : 'bg-gray-800/90 text-gray-400 border-gray-700'
                  }`}>
                    <span className="text-xs font-bold">{step === 1 ? '1' : step === 2 ? '2' : '3'}</span>
                  </div>
                  {step < 3 && (
                    <div className={`w-12 h-0.5 mx-2 ${
                      step < currentStep ? 'bg-green-500' : 'bg-gray-800'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
          {/* Step explainers */}
          {currentStep === 1 && (
            <div className="space-y-3">
              <div className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
                Step 1: Secret & Password
              </div>
              <div>
                <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 shadow-lg">
                  <p className="text-gray-300 leading-relaxed">
                    Start by entering the information you&apos;d like to protect and create a password. You&apos;ll need this password later when recovering your secret.
                  </p>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-3">
              <div className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
                Step 2: Configuration
              </div>
              <div>
                <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 shadow-lg">
                  <p className="text-gray-300 leading-relaxed">
                    Select your preferred security level by choosing the total number of shards and how many you&apos;ll need to recover your secret. You can use one of our presets or create a custom configuration.
                  </p>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-3">
              <div className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
                Step 3: Export
              </div>
              <div>
                <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 shadow-lg">
                  <p className="text-gray-300 leading-relaxed">
                    Choose how you&apos;d like to save your shards. Text files are easy to store digitally, while QR codes are convenient for printing and physical storage.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Secret, Password & Label */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <label htmlFor="secret" className="text-lg font-semibold mb-2 flex items-center">
                  Secret
                  <span className="ml-2 text-xs px-2 py-0.5 bg-red-500/10 text-red-500 rounded-full border border-red-500/20">Required</span>
                  <div className="group relative ml-1">
                    <InformationCircleIcon className="h-4 w-4 text-gray-400" />
                    <div className="hidden group-hover:block absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 w-64 p-2 bg-gray-800 text-sm text-gray-300 rounded-lg shadow-lg">
                      Enter the sensitive information you want to protect (e.g., recovery phrase, private key, password)
                    </div>
                  </div>
                </label>
                <textarea 
                  id="secret" 
                  className={`w-full px-4 py-3 bg-gray-800 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    fieldErrors.secret ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-700'
                  }`}
                  value={secret} 
                  onChange={(e) => setSecret(e.target.value)}
                  rows={4}
                  placeholder="Enter your secret here..."
                />
              </div>

              <div>
                <label htmlFor="password" className="text-lg font-semibold mb-2 flex items-center">
                  Password
                  <span className="ml-2 text-xs px-2 py-0.5 bg-red-500/10 text-red-500 rounded-full border border-red-500/20">Required</span>
                  <div className="group relative ml-1">
                    <InformationCircleIcon className="h-4 w-4 text-gray-400" />
                    <div className="hidden group-hover:block absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 w-64 p-2 bg-gray-800 text-sm text-gray-300 rounded-lg shadow-lg">
                      Choose a strong password that will be needed along with the shards to recover your secret
                    </div>
                  </div>
                </label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    id="password" 
                    className={`w-full px-4 py-3 bg-gray-800 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                      fieldErrors.password ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-700'
                    }`}
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter a strong password..." 
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex space-x-2">
                    <button 
                      className="text-gray-400 hover:text-gray-200 transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                    </button>
                    <button
                      onClick={generatePassword}
                      className="text-gray-400 hover:text-gray-200 transition-colors"
                      title="Generate strong password"
                    >
                      <ArrowPathIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <div className="mt-2">
                  <div className="h-1 w-full bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${getPasswordStrengthColor()} transition-all duration-300`}
                      style={{ width: `${(passwordStrength + 1) * 20}%` }}
                    ></div>
                  </div>
                  <p className="text-sm mt-1 text-gray-400">
                    Password strength: {['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'][passwordStrength]}
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor="label" className="text-lg font-semibold mb-2 flex items-center">
                  Label
                  <span className="ml-2 text-xs px-2 py-0.5 bg-gray-500/10 text-gray-400 rounded-full border border-gray-500/20">Optional</span>
                  <div className="group relative ml-1">
                    <InformationCircleIcon className="h-4 w-4 text-gray-400" />
                    <div className="hidden group-hover:block absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 w-64 p-2 bg-gray-800 text-sm text-gray-300 rounded-lg shadow-lg">
                      Add a memorable name for your shards (e.g., &apos;wallet-backup&apos;, &apos;ssh-key&apos;)
                    </div>
                  </div>
                </label>
                <input 
                  type="text" 
                  id="label" 
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  value={label} 
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Enter a label for your shards..." 
                />
              </div>
            </div>
          )}

          {/* Step 2: Shard Configuration */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <label className="text-lg font-semibold mb-3 flex items-center">
                  Shard Configuration
                  <span className="ml-2 text-xs px-2 py-0.5 bg-red-500/10 text-red-500 rounded-full border border-red-500/20">Required</span>
                  <div className="group relative ml-1">
                    <InformationCircleIcon className="h-4 w-4 text-gray-400" />
                    <div className="hidden group-hover:block absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 w-64 p-2 bg-gray-800 text-sm text-gray-300 rounded-lg shadow-lg">
                      Shards are encrypted pieces of your secret. Requiring more shards adds security by ensuring more pieces must be brought together to recover the secret.
                    </div>
                  </div>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  {presets.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => handlePresetChange(preset.name)}
                      className={`px-4 py-2 rounded-lg border transition-all duration-200 ${
                        selectedPreset === preset.name
                          ? 'bg-blue-600 border-blue-700 text-white'
                          : 'border-gray-600 text-gray-400 hover:border-gray-400'
                      }`}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="required-shards" className="text-lg font-semibold mb-2 flex items-center">
                  Required Shards
                  <span className="ml-2 text-xs px-2 py-0.5 bg-red-500/10 text-red-500 rounded-full border border-red-500/20">Required</span>
                  <div className="group relative ml-1">
                    <InformationCircleIcon className="h-4 w-4 text-gray-400" />
                    <div className="hidden group-hover:block absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 w-64 p-2 bg-gray-800 text-sm text-gray-300 rounded-lg shadow-lg">
                      The minimum number of shards needed to recover your secret. Higher numbers mean more pieces must be combined to recover the secret.
                    </div>
                  </div>
                </label>
                <div className="flex items-center justify-between mb-2 text-sm text-gray-400">
                  <span>1</span>
                  <span className="text-lg font-bold text-blue-500">{requiredShards}</span>
                  <span>10</span>
                </div>
                <input 
                  type="range" 
                  id="required-shards" 
                  min="1" 
                  max="10" 
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  value={requiredShards} 
                  onChange={(e) => {
                    setRequiredShards(Number(e.target.value));
                    setSelectedPreset("Custom");
                  }} 
                />
              </div>

              <div>
                <label htmlFor="total-shards" className="text-lg font-semibold mb-2 flex items-center">
                  Total Shards
                  <span className="ml-2 text-xs px-2 py-0.5 bg-red-500/10 text-red-500 rounded-full border border-red-500/20">Required</span>
                  <div className="group relative ml-1">
                    <InformationCircleIcon className="h-4 w-4 text-gray-400" />
                    <div className="hidden group-hover:block absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 w-64 p-2 bg-gray-800 text-sm text-gray-300 rounded-lg shadow-lg">
                      The total number of shards to create. You can store these in different locations. More shards provide flexibility in how they&apos;re stored.
                    </div>
                  </div>
                </label>
                <div className="flex items-center justify-between mb-2 text-sm text-gray-400">
                  <span>1</span>
                  <span className="text-lg font-bold text-blue-500">{totalShards}</span>
                  <span>10</span>
                </div>
                <input 
                  type="range" 
                  id="total-shards" 
                  min="1" 
                  max="10" 
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  value={totalShards} 
                  onChange={(e) => {
                    setTotalShards(Number(e.target.value));
                    setSelectedPreset("Custom");
                  }} 
                />
              </div>
            </div>
          )}

          {/* Step 3: Export Formats */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <label className="text-lg font-semibold mb-3 flex items-center">
                  Export Formats
                  <span className="ml-2 text-xs px-2 py-0.5 bg-red-500/10 text-red-500 rounded-full border border-red-500/20">Required</span>
                  <div className="group relative ml-1">
                    <InformationCircleIcon className="h-4 w-4 text-gray-400" />
                    <div className="hidden group-hover:block absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 w-64 p-2 bg-gray-800 text-sm text-gray-300 rounded-lg shadow-lg">
                      Choose how to save your shards - as text files (TXT) or QR codes (PNG)
                    </div>
                  </div>
                </label>
                <div className="flex space-x-4">
                  <button
                    onClick={() => handleFormatChange("TXT")}
                    className={`flex items-center px-4 py-2 rounded-lg border transition-all duration-200 ${
                      exportFormats.has("TXT") 
                        ? 'bg-blue-600 border-blue-700 text-white' 
                        : 'border-gray-600 text-gray-400 hover:border-gray-400'
                    }`}
                  >
                    <DocumentDuplicateIcon className="h-5 w-5 mr-2" />
                    TXT
                  </button>
                  <button
                    onClick={() => handleFormatChange("PNG")}
                    className={`flex items-center px-4 py-2 rounded-lg border transition-all duration-200 ${
                      exportFormats.has("PNG") 
                        ? 'bg-blue-600 border-blue-700 text-white' 
                        : 'border-gray-600 text-gray-400 hover:border-gray-400'
                    }`}
                  >
                    <QrCodeIcon className="h-5 w-5 mr-2" />
                    PNG
                  </button>
                </div>
              </div>

              <div className="flex space-x-4 pt-4">
                <button 
                  onClick={handleClick} 
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  Generate Shards
                </button>

                {shards.length > 0 && (
                  <button 
                    onClick={exportShards} 
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                  >
                    Export Shards
                  </button>
                )}
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="mt-4 w-full">
              <div className="bg-red-500/10 border border-red-500/50 backdrop-blur-sm p-4 rounded-lg shadow-lg">
                <p className="text-red-500 text-center font-medium">{errorMessage}</p>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="mt-4 w-full">
              <div className="bg-green-500/10 border border-green-500/50 backdrop-blur-sm p-4 rounded-lg shadow-lg">
                <p className="text-green-500 text-center font-medium">{successMessage}</p>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between mt-8">
            <button
              onClick={prevStep}
              className={`px-6 py-2 rounded-lg transition-colors duration-200 ${
                currentStep === 1 
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
              disabled={currentStep === 1}
            >
              Previous
            </button>
            {currentStep < 3 && (
              <button
                onClick={nextStep}
                className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-200"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

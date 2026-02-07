import React, { useEffect, useMemo, useState } from "react";
import { splitString } from "./helpers/secureshards";
import {
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentDuplicateIcon,
  DocumentTextIcon,
  EyeIcon,
  EyeSlashIcon,
  InformationCircleIcon,
  QrCodeIcon
} from "@heroicons/react/20/solid";
import JSZip from "jszip";
import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import { RecoveryTestBundle } from "./types";

type PresetKey = "starter" | "balanced" | "paranoid" | "custom";

type GenerateTabProps = {
  onRecoveryTestReady: (bundle: RecoveryTestBundle) => void;
  onStartRecoveryTest: () => void;
};

const presetOptions: {
  description: string;
  key: PresetKey;
  required: number;
  title: string;
  total: number;
}[] = [
  {
    key: "starter",
    title: "Starter",
    required: 2,
    total: 3,
    description: "Simple setup for first-time backups."
  },
  {
    key: "balanced",
    title: "Balanced",
    required: 3,
    total: 5,
    description: "Recommended for most personal secrets."
  },
  {
    key: "paranoid",
    title: "Paranoid",
    required: 5,
    total: 7,
    description: "Higher resilience with stricter recovery."
  },
  {
    key: "custom",
    title: "Custom",
    required: 1,
    total: 1,
    description: "Tune the exact numbers yourself."
  }
];

const words = [
  "correct",
  "horse",
  "battery",
  "staple",
  "apple",
  "banana",
  "cherry",
  "dolphin",
  "elephant",
  "falcon",
  "giraffe",
  "hedgehog",
  "iguana",
  "jaguar",
  "kangaroo",
  "leopard",
  "monkey",
  "narwhal",
  "octopus",
  "penguin",
  "quokka",
  "rabbit",
  "snake",
  "tiger",
  "unicorn",
  "vulture",
  "walrus",
  "xenon",
  "yak",
  "zebra"
];

const recoveryUrl = "https://secureshards.sv3n.me";
const passwordStrengthLabels = ["Very Weak", "Weak", "Fair", "Strong", "Very Strong"];
type ZxcvbnFn = typeof import("zxcvbn");
type ZxcvbnModule = { default: ZxcvbnFn };
let zxcvbnModulePromise: Promise<ZxcvbnModule> | null = null;

const loadZxcvbn = async () => {
  if (!zxcvbnModulePromise) {
    zxcvbnModulePromise = import("zxcvbn") as Promise<ZxcvbnModule>;
  }
  return zxcvbnModulePromise;
};

export default function GenerateTab({ onRecoveryTestReady, onStartRecoveryTest }: GenerateTabProps) {
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
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>("starter");
  const [showExplainer, setShowExplainer] = useState(false);
  const [showConfigHelper, setShowConfigHelper] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordFeedback, setPasswordFeedback] = useState("Use a long, unique passphrase.");
  const [currentStep, setCurrentStep] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({
    password: false,
    secret: false
  });
  const [safetyChecklist, setSafetyChecklist] = useState({
    distributedShards: false,
    passwordStoredSeparately: false,
    testedRecovery: false
  });

  useEffect(() => {
    const hasVisitedBefore = localStorage.getItem("hasVisitedBefore");
    if (!hasVisitedBefore) {
      setShowExplainer(true);
      localStorage.setItem("hasVisitedBefore", "true");
    }
  }, []);

  useEffect(() => {
    if (!password) {
      setPasswordStrength(0);
      setPasswordFeedback("Use a long, unique passphrase.");
      return;
    }

    let isCancelled = false;

    const evaluatePassword = async () => {
      const zxcvbn = await loadZxcvbn();
      if (isCancelled) {
        return;
      }

      const result = zxcvbn.default(password);
      setPasswordStrength(Math.max(0, Math.min(4, result.score)));

      const feedback = [result.feedback.warning, ...result.feedback.suggestions]
        .filter(Boolean)
        .join(" ")
        .trim();

      setPasswordFeedback(feedback || "Good choice. Keep this password separate from your shards.");
    };

    void evaluatePassword();

    return () => {
      isCancelled = true;
    };
  }, [password]);

  const canLoseShards = useMemo(
    () => Math.max(0, totalShards - requiredShards),
    [requiredShards, totalShards]
  );

  const recoverySummary = useMemo(() => {
    if (requiredShards === totalShards) {
      return "You must keep every shard. Losing one shard blocks recovery.";
    }
    if (requiredShards === 1) {
      return "Any single shard plus password can recover your secret.";
    }
    return `You can lose ${canLoseShards} shard${canLoseShards === 1 ? "" : "s"} and still recover.`;
  }, [canLoseShards, requiredShards, totalShards]);

  const allSafetyChecksDone = useMemo(
    () => Object.values(safetyChecklist).every(Boolean),
    [safetyChecklist]
  );

  const getPasswordStrengthColor = () => {
    const colors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-green-400", "bg-green-500"];
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

  const handlePresetChange = (presetKey: PresetKey) => {
    setSelectedPreset(presetKey);
    const selected = presetOptions.find((preset) => preset.key === presetKey);
    if (!selected || presetKey === "custom") {
      return;
    }
    setRequiredShards(selected.required);
    setTotalShards(selected.total);
  };

  const handleRequiredChange = (value: number) => {
    const nextRequired = Math.min(10, Math.max(1, value));
    setRequiredShards(nextRequired);
    if (nextRequired > totalShards) {
      setTotalShards(nextRequired);
    }
    setSelectedPreset("custom");
  };

  const handleTotalChange = (value: number) => {
    const nextTotal = Math.min(10, Math.max(1, value));
    setTotalShards(nextTotal);
    if (nextTotal < requiredShards) {
      setRequiredShards(nextTotal);
    }
    setSelectedPreset("custom");
  };

  const toggleSafetyChecklistItem = (key: keyof typeof safetyChecklist) => {
    setSafetyChecklist((previous) => ({
      ...previous,
      [key]: !previous[key]
    }));
  };

  const loadDemoScenario = () => {
    setSecret("abandon ability able about above absent absorb abstract absurd abuse access accident");
    setPassword("Falcon-Tiger-Narwhal-Apple-4821");
    setShowPassword(true);
    setLabel("wallet-demo");
    setRequiredShards(3);
    setTotalShards(5);
    setSelectedPreset("balanced");
    setExportFormats(new Set(["TXT", "PDF"]));
    setCurrentStep(2);
    setErrorMessage("");
    setSuccessMessage("Demo values loaded. Continue through configuration and generate shards.");
  };

  const nextStep = () => {
    if (currentStep === 1) {
      setFieldErrors({
        password: !password,
        secret: !secret
      });

      if (!secret.trim() || !password.trim()) {
        setErrorMessage("Add both your secret and password before continuing.");
        return;
      }
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

  const createRecoveryPackReadme = (
    fileLabel: string,
    selectedFormats: string[],
    timestamp: number
  ) => {
    const createdAt = new Date(timestamp).toISOString();

    return [
      "SecureShards Recovery Pack",
      "",
      `Label: ${fileLabel}`,
      `Threshold: ${requiredShards} of ${totalShards}`,
      `Formats in this ZIP: ${selectedFormats.join(", ")}`,
      `Created at (UTC): ${createdAt}`,
      "",
      "Recovery instructions:",
      `1. Open ${recoveryUrl}`,
      "2. Switch to the Recover tab.",
      "3. Upload enough shard files (TXT, PNG, or PDF).",
      "4. Enter your original password.",
      "5. Click Recover Secret.",
      "",
      "Safety notes:",
      "- Keep shards in separate locations.",
      "- Never store your password in the same place as all shards.",
      "- If your password is lost, recovery is impossible.",
      ""
    ].join("\n");
  };

  const exportShards = async () => {
    if (!shards.length) {
      setErrorMessage("Generate shards before exporting.");
      return;
    }

    if (exportFormats.size === 0) {
      setErrorMessage("Select at least one export format.");
      return;
    }

    if (!allSafetyChecksDone) {
      setErrorMessage("Complete all safety checks before exporting.");
      return;
    }

    setIsExporting(true);
    setErrorMessage("");

    try {
      const fileLabel = label || "shards";
      const timestamp = Date.now();
      const zip = new JSZip();
      const selectedFormats = Array.from(exportFormats).sort();

      zip.file("Recovery-Pack-README.txt", createRecoveryPackReadme(fileLabel, selectedFormats, timestamp));

      for (const format of exportFormats) {
        const formatFolder = zip.folder(format);

        if (format === "TXT") {
          shards.forEach((shard, index) => {
            formatFolder!.file(`${fileLabel}-${index + 1}-${timestamp}.txt`, shard);
          });
        }

        if (format === "PNG") {
          const qrCodes = await Promise.all(
            shards.map((shard, index) =>
              QRCode.toDataURL(shard).then((url: string) => ({
                index,
                url
              }))
            )
          );

          qrCodes.forEach(({ url, index }) => {
            const imgBlob = dataURLtoBlob(url);
            formatFolder!.file(`${fileLabel}-${index + 1}-${timestamp}.png`, imgBlob);
          });
        }

        if (format === "PDF") {
          const pdfFiles = await Promise.all(
            shards.map((shard, index) =>
              createShardPdfBlob(shard, index + 1, shards.length).then((pdfBlob) => ({
                index,
                pdfBlob
              }))
            )
          );

          pdfFiles.forEach(({ index, pdfBlob }) => {
            formatFolder!.file(`${fileLabel}-${index + 1}-${timestamp}.pdf`, pdfBlob);
          });
        }
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fileLabel}-${timestamp}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccessMessage("Shards exported. Keep password and shards in separate locations.");
    } catch (error) {
      console.error(error);
      setErrorMessage("Export failed. Try again or choose fewer formats at once.");
    } finally {
      setIsExporting(false);
    }
  };

  const createShardPdfBlob = async (shard: string, shardIndex: number, total: number) => {
    const pdf = new jsPDF({ format: "a4", orientation: "portrait", unit: "pt" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 44;
    let y = 56;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text(`SecureShards Shard ${shardIndex} of ${total}`, margin, y);

    y += 28;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);

    const intro = pdf.splitTextToSize(
      "This PDF contains one encrypted shard encoded as a QR code. Keep this file private and store it separately from your other shards.",
      pageWidth - margin * 2
    );
    pdf.text(intro, margin, y);
    y += intro.length * 14 + 12;

    pdf.setFont("helvetica", "bold");
    pdf.text("How to recover your secret:", margin, y);
    y += 18;

    pdf.setFont("helvetica", "normal");
    const steps = [
      `1. Open ${recoveryUrl}`,
      "2. Switch to the Recover tab.",
      "3. Upload your shard files (TXT, PNG, or PDF).",
      "4. Enter the same password used when you generated the shards.",
      "5. Click Recover Secret."
    ];

    steps.forEach((step) => {
      const lines = pdf.splitTextToSize(step, pageWidth - margin * 2);
      pdf.text(lines, margin, y);
      y += lines.length * 14 + 2;
    });

    y += 6;
    pdf.setTextColor(37, 99, 235);
    pdf.textWithLink(recoveryUrl, margin, y, { url: recoveryUrl });
    pdf.setTextColor(31, 41, 55);

    y += 22;
    const qrDataUrl = await QRCode.toDataURL(shard, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 1024
    });
    const qrSize = 220;
    const qrX = (pageWidth - qrSize) / 2;
    pdf.addImage(qrDataUrl, "PNG", qrX, y, qrSize, qrSize);

    y += qrSize + 20;
    pdf.setFontSize(10);
    const qrHint = pdf.splitTextToSize(
      "The Recover tab reads this QR code automatically when this PDF is uploaded.",
      pageWidth - margin * 2
    );
    pdf.text(qrHint, margin, y);

    return pdf.output("blob");
  };

  const dataURLtoBlob = (dataURL: string) => {
    const arr = dataURL.split(",");
    const mime = arr[0].match(/:(.*?);/)?.[1] || "image/png";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const handleGenerateShards = async () => {
    if (!secret.trim() || !password.trim()) {
      setErrorMessage("Your secret and password are both required.");
      setSuccessMessage("");
      setShards([]);
      return;
    }

    if (exportFormats.size === 0) {
      setErrorMessage("Pick at least one export format (TXT, PNG, or PDF).");
      setSuccessMessage("");
      setShards([]);
      return;
    }

    try {
      const shares = await splitString(secret, totalShards, requiredShards, password);
      setShards(shares);
      setSafetyChecklist({
        distributedShards: false,
        passwordStoredSeparately: false,
        testedRecovery: false
      });
      setErrorMessage("");
      setSuccessMessage("Shards generated. Review the safety checklist, then export.");
    } catch (error) {
      console.error(error);
      setErrorMessage("Shard generation failed. Try a shorter secret or regenerate once.");
      setSuccessMessage("");
      setShards([]);
    }
  };

  const generatePassword = () => {
    const selectedWords = Array.from({ length: 4 }, () => {
      const word = words[Math.floor(Math.random() * words.length)];
      return word.charAt(0).toUpperCase() + word.slice(1);
    });
    const randomNum = Math.floor(Math.random() * 9000) + 1000;
    const newPassword = `${selectedWords.join("-")}-${randomNum}`;
    setShowPassword(true);
    setPassword(newPassword);
    setErrorMessage("");
  };

  const startRecoveryTest = () => {
    if (!shards.length) {
      setErrorMessage("Generate shards first, then you can test recovery.");
      return;
    }

    onRecoveryTestReady({
      createdAt: new Date().toISOString(),
      label: label || "shards",
      password,
      requiredShards,
      shards,
      totalShards
    });

    setSafetyChecklist((previous) => ({
      ...previous,
      testedRecovery: true
    }));

    onStartRecoveryTest();
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
              {showExplainer ? <ChevronUpIcon className="h-5 w-5" /> : <ChevronDownIcon className="h-5 w-5" />}
            </button>
            {showExplainer && (
              <div className="mt-4 text-gray-300 space-y-2">
                <p>
                  SecureShards splits sensitive information into encrypted pieces. You need both a minimum number
                  of shards and your password to recover. Everything runs locally in your browser.
                </p>
                <p className="text-sm text-gray-400">
                  New here? Load the demo values and complete a test recovery once before using real secrets.
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={loadDemoScenario}
              className="px-4 py-2 rounded-lg border border-blue-500/40 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 transition-colors"
            >
              Load Beginner Demo
            </button>
            <p className="text-sm text-gray-400 self-center">
              Demo mode uses sample data so you can practice the full generate and recover flow.
            </p>
          </div>

          <div className="flex flex-col items-center space-y-2 mb-6">
            <div className="flex justify-center items-center space-x-3">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-lg flex flex-col items-center justify-center text-sm border ${
                      step === currentStep
                        ? "bg-indigo-600/90 text-white border-indigo-500"
                        : step < currentStep
                          ? "bg-green-600/90 text-white border-green-500"
                          : "bg-gray-800/90 text-gray-400 border-gray-700"
                    }`}
                  >
                    <span className="text-xs font-bold">{step}</span>
                  </div>
                  {step < 3 && (
                    <div className={`w-12 h-0.5 mx-2 ${step < currentStep ? "bg-green-500" : "bg-gray-800"}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {currentStep === 1 && (
            <div className="space-y-3">
              <div className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
                Step 1: Secret and Password
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-amber-200 text-sm">
                If this password is lost, your secret cannot be recovered even if all shards are available.
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-3">
              <div className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
                Step 2: Configuration
              </div>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <p className="text-blue-200 font-semibold">
                  {requiredShards} of {totalShards} shards are required to recover.
                </p>
                <p className="text-sm text-blue-100 mt-1">{recoverySummary}</p>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-3">
              <div className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
                Step 3: Export
              </div>
              <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 shadow-lg">
                <p className="text-gray-300 leading-relaxed">
                  Export includes a recovery pack file with instructions. PDF exports also include printable instructions
                  and the shard QR code.
                </p>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <label htmlFor="secret" className="text-lg font-semibold mb-2 flex items-center">
                  Secret
                  <span className="ml-2 text-xs px-2 py-0.5 bg-red-500/10 text-red-500 rounded-full border border-red-500/20">
                    Required
                  </span>
                  <div className="group relative ml-1">
                    <InformationCircleIcon className="h-4 w-4 text-gray-400" />
                    <div className="hidden group-hover:block absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 w-64 p-2 bg-gray-800 text-sm text-gray-300 rounded-lg shadow-lg">
                      Enter the sensitive information to protect, such as a recovery phrase or private key.
                    </div>
                  </div>
                </label>
                <textarea
                  id="secret"
                  className={`w-full px-4 py-3 bg-gray-800 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    fieldErrors.secret ? "border-red-500 ring-1 ring-red-500" : "border-gray-700"
                  }`}
                  value={secret}
                  onChange={(event) => setSecret(event.target.value)}
                  rows={4}
                  placeholder="Enter your secret here..."
                />
              </div>

              <div>
                <label htmlFor="password" className="text-lg font-semibold mb-2 flex items-center">
                  Password
                  <span className="ml-2 text-xs px-2 py-0.5 bg-red-500/10 text-red-500 rounded-full border border-red-500/20">
                    Required
                  </span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    className={`w-full px-4 py-3 bg-gray-800 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                      fieldErrors.password ? "border-red-500 ring-1 ring-red-500" : "border-gray-700"
                    }`}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
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
                    />
                  </div>
                  <p className="text-sm mt-1 text-gray-300">
                    Password strength: {passwordStrengthLabels[passwordStrength]}
                  </p>
                  <p className="text-xs mt-1 text-gray-400">{passwordFeedback}</p>
                </div>
              </div>

              <div>
                <label htmlFor="label" className="text-lg font-semibold mb-2 flex items-center">
                  Label
                  <span className="ml-2 text-xs px-2 py-0.5 bg-gray-500/10 text-gray-400 rounded-full border border-gray-500/20">
                    Optional
                  </span>
                </label>
                <input
                  type="text"
                  id="label"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder="Enter a label for your shards..."
                />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <label className="text-lg font-semibold mb-3 flex items-center">
                  Shard Setup Presets
                  <span className="ml-2 text-xs px-2 py-0.5 bg-red-500/10 text-red-500 rounded-full border border-red-500/20">
                    Required
                  </span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  {presetOptions.map((preset) => (
                    <button
                      key={preset.key}
                      onClick={() => handlePresetChange(preset.key)}
                      className={`text-left p-4 rounded-lg border transition-all duration-200 ${
                        selectedPreset === preset.key
                          ? "bg-blue-600 border-blue-700 text-white"
                          : "border-gray-600 text-gray-300 hover:border-gray-400"
                      }`}
                    >
                      <p className="font-semibold">{preset.title}</p>
                      <p className="text-sm opacity-90 mt-1">
                        {preset.key === "custom" ? "Manual values" : `${preset.required}/${preset.total}`}
                      </p>
                      <p className="text-xs opacity-80 mt-2">{preset.description}</p>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowConfigHelper(!showConfigHelper)}
                  className="text-sm text-blue-300 hover:text-blue-200 transition-colors"
                >
                  {showConfigHelper ? "Hide" : "What should I choose?"}
                </button>
                {showConfigHelper && (
                  <div className="mt-3 bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-sm text-gray-300 space-y-2">
                    <p>
                      Starter is easiest for beginners and works well for personal backup where you can keep 3 copies.
                    </p>
                    <p>
                      Balanced is the best default for most users because it tolerates losing two shard files.
                    </p>
                    <p>
                      Paranoid is stricter. Use it when you can safely manage more storage locations and process steps.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="required-shards" className="text-lg font-semibold mb-2 flex items-center">
                  Required Shards
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
                  onChange={(event) => handleRequiredChange(Number(event.target.value))}
                />
              </div>

              <div>
                <label htmlFor="total-shards" className="text-lg font-semibold mb-2 flex items-center">
                  Total Shards
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
                  onChange={(event) => handleTotalChange(Number(event.target.value))}
                />
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <label className="text-lg font-semibold mb-3 flex items-center">
                  Export Formats
                  <span className="ml-2 text-xs px-2 py-0.5 bg-red-500/10 text-red-500 rounded-full border border-red-500/20">
                    Required
                  </span>
                </label>
                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={() => handleFormatChange("TXT")}
                    className={`flex items-center px-4 py-2 rounded-lg border transition-all duration-200 ${
                      exportFormats.has("TXT")
                        ? "bg-blue-600 border-blue-700 text-white"
                        : "border-gray-600 text-gray-400 hover:border-gray-400"
                    }`}
                  >
                    <DocumentDuplicateIcon className="h-5 w-5 mr-2" />
                    TXT
                  </button>
                  <button
                    onClick={() => handleFormatChange("PNG")}
                    className={`flex items-center px-4 py-2 rounded-lg border transition-all duration-200 ${
                      exportFormats.has("PNG")
                        ? "bg-blue-600 border-blue-700 text-white"
                        : "border-gray-600 text-gray-400 hover:border-gray-400"
                    }`}
                  >
                    <QrCodeIcon className="h-5 w-5 mr-2" />
                    PNG
                  </button>
                  <button
                    onClick={() => handleFormatChange("PDF")}
                    className={`flex items-center px-4 py-2 rounded-lg border transition-all duration-200 ${
                      exportFormats.has("PDF")
                        ? "bg-blue-600 border-blue-700 text-white"
                        : "border-gray-600 text-gray-400 hover:border-gray-400"
                    }`}
                  >
                    <DocumentTextIcon className="h-5 w-5 mr-2" />
                    PDF
                  </button>
                </div>
              </div>

              {shards.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-3">
                  <p className="text-amber-100 font-semibold">Before exporting, confirm:</p>
                  <label className="flex items-start gap-3 text-sm text-amber-100">
                    <input
                      type="checkbox"
                      checked={safetyChecklist.passwordStoredSeparately}
                      onChange={() => toggleSafetyChecklistItem("passwordStoredSeparately")}
                      className="mt-0.5"
                    />
                    I stored the password separately from shard files.
                  </label>
                  <label className="flex items-start gap-3 text-sm text-amber-100">
                    <input
                      type="checkbox"
                      checked={safetyChecklist.distributedShards}
                      onChange={() => toggleSafetyChecklistItem("distributedShards")}
                      className="mt-0.5"
                    />
                    I plan to store shards in different places.
                  </label>
                  <label className="flex items-start gap-3 text-sm text-amber-100">
                    <input
                      type="checkbox"
                      checked={safetyChecklist.testedRecovery}
                      onChange={() => toggleSafetyChecklistItem("testedRecovery")}
                      className="mt-0.5"
                    />
                    I completed a test recovery (recommended).
                  </label>
                  <p className="text-xs text-amber-200">
                    {allSafetyChecksDone
                      ? "Safety checks complete. Export is enabled."
                      : "Complete all checks to unlock export."}
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <button
                  onClick={handleGenerateShards}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  Generate Shards
                </button>

                {shards.length > 0 && (
                  <button
                    onClick={startRecoveryTest}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                  >
                    Test Recovery Now
                  </button>
                )}

                {shards.length > 0 && (
                  <button
                    onClick={exportShards}
                    disabled={!allSafetyChecksDone || isExporting}
                    className={`flex-1 font-semibold py-3 px-6 rounded-lg transition-colors duration-200 ${
                      allSafetyChecksDone && !isExporting
                        ? "bg-green-600 hover:bg-green-700 text-white"
                        : "bg-gray-700 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {isExporting ? "Exporting..." : "Export Shards"}
                  </button>
                )}
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="mt-4 w-full">
              <div className="bg-red-500/10 border border-red-500/50 backdrop-blur-sm p-4 rounded-lg shadow-lg">
                <p className="text-red-400 text-center font-medium">{errorMessage}</p>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="mt-4 w-full">
              <div className="bg-green-500/10 border border-green-500/50 backdrop-blur-sm p-4 rounded-lg shadow-lg">
                <p className="text-green-400 text-center font-medium">{successMessage}</p>
              </div>
            </div>
          )}

          <div className="flex justify-between mt-8">
            <button
              onClick={prevStep}
              className={`px-6 py-2 rounded-lg transition-colors duration-200 ${
                currentStep === 1
                  ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
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

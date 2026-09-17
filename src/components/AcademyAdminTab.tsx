import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GraduationCap, Plus, Trash2, Edit3, Check, CheckCircle, 
  AlertCircle, UploadCloud, FileText, IndianRupee, Save, X, 
  RefreshCw, Sparkles, BookOpen, Layers
} from 'lucide-react';
import { AcademyResource, AcademySettings } from '../types';
import { uploadFileToStorageWithProgress, deleteFileFromStorage } from '../lib/firebase';

interface AcademyAdminTabProps {
  academyHeading: string;
  setAcademyHeading: React.Dispatch<React.SetStateAction<string>>;
  academyResources: AcademyResource[];
  setAcademyResources: React.Dispatch<React.SetStateAction<AcademyResource[]>>;
  onSaveHeading?: (heading: string) => Promise<void>;
  onSaveResource?: (resource: AcademyResource) => Promise<void>;
  onDeleteResource?: (resourceId: string, index?: number) => Promise<void>;
}

export default function AcademyAdminTab({
  academyHeading,
  setAcademyHeading,
  academyResources,
  setAcademyResources,
  onSaveHeading,
  onSaveResource,
  onDeleteResource
}: AcademyAdminTabProps) {
  // Heading Edit State
  const [headingText, setHeadingText] = useState(academyHeading);
  const [isSavingHeading, setIsSavingHeading] = useState(false);
  const [headingSuccess, setHeadingSuccess] = useState<string | null>(null);

  // Deletion State & Feedback
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteNotification, setDeleteNotification] = useState<string | null>(null);

  // Material Modal / Edit State
  const [isAddingOrEditing, setIsAddingOrEditing] = useState(false);
  const [editingResource, setEditingResource] = useState<AcademyResource | null>(null);

  // Material Form States
  const [formTitle, setFormTitle] = useState('');
  const [formStream, setFormStream] = useState('Commerce & Financial Studies');
  const [formBadge, setFormBadge] = useState('State Board Syllabus');
  const [formDescription, setFormDescription] = useState('');
  const [formTier, setFormTier] = useState<'free' | 'paid'>('free');
  const [formPriceINR, setFormPriceINR] = useState<number>(0);
  const [formDocPages, setFormDocPages] = useState<number>(45);
  const [formFeatures, setFormFeatures] = useState<string>('');
  
  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfFileName, setPdfFileName] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle Save Custom Heading
  const handleSaveHeading = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!headingText.trim()) return;

    setIsSavingHeading(true);
    setHeadingSuccess(null);
    try {
      setAcademyHeading(headingText.trim());
      if (onSaveHeading) {
        await onSaveHeading(headingText.trim());
      } else {
        localStorage.setItem('ocu_academy_heading', headingText.trim());
      }
      setHeadingSuccess('Main heading updated successfully!');
      setTimeout(() => setHeadingSuccess(null), 3500);
    } catch (err) {
      console.error('Failed to save heading:', err);
    } finally {
      setIsSavingHeading(false);
    }
  };

  // Open Add Form
  const handleOpenAdd = () => {
    setEditingResource(null);
    setFormTitle('');
    setFormStream('Commerce & Financial Studies');
    setFormBadge('State Board Syllabus');
    setFormDescription('');
    setFormTier('free');
    setFormPriceINR(0);
    setFormDocPages(40);
    setFormFeatures('Golden Rules of Accounting\nBank Reconciliation (BRS) Guide\nSolved Board Question Sets');
    setSelectedFile(null);
    setPdfFileName('');
    setPdfUrl('');
    setUploadProgress(null);
    setUploadStatus('');
    setFormError(null);
    setFormSuccess(null);
    setIsAddingOrEditing(true);
  };

  // Open Edit Form
  const handleOpenEdit = (res: AcademyResource) => {
    setEditingResource(res);
    setFormTitle(res.title);
    setFormStream(res.stream);
    setFormBadge(res.badge);
    setFormDescription(res.description);
    setFormTier(res.tier || 'free');
    setFormPriceINR(res.priceINR || 0);
    setFormDocPages(res.docPages || 40);
    setFormFeatures((res.features || []).join('\n'));
    setSelectedFile(null);
    setPdfFileName(res.pdfFileName || '');
    setPdfUrl(res.pdfUrl || '');
    setUploadProgress(null);
    setUploadStatus('');
    setFormError(null);
    setFormSuccess(null);
    setIsAddingOrEditing(true);
  };

  // Handle PDF File Selection (Triggers Native File Picker on Mobile)
  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        setFormError('Please select a valid PDF file document.');
        return;
      }
      setSelectedFile(file);
      setPdfFileName(file.name);
      setFormError(null);
      setUploadStatus(`Selected: ${file.name} (${Math.round(file.size / 1024)} KB)`);
    }
  };

  // Handle Material Form Submission
  const handleSubmitResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('Resource title is required.');
      return;
    }

    if (formTier === 'paid' && (formPriceINR <= 0 || isNaN(formPriceINR))) {
      setFormError('Please enter a valid price in Indian Rupees (₹) for paid tier materials.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    setFormSuccess(null);

    let finalPdfUrl = pdfUrl;
    let finalPdfName = pdfFileName;

    // Upload PDF if a new file was chosen
    if (selectedFile) {
      setUploadStatus('Uploading PDF document to cloud storage...');
      setUploadProgress(10);
      try {
        finalPdfUrl = await uploadFileToStorageWithProgress(
          'academy_pdfs',
          selectedFile.name,
          selectedFile,
          (pct) => setUploadProgress(pct),
          45000
        );
        finalPdfName = selectedFile.name;
        setUploadStatus('PDF upload complete!');
      } catch (uploadErr) {
        console.warn('Cloud storage upload warning, storing local fallback URL:', uploadErr);
        // Fallback to local object URL or data URL
        finalPdfUrl = URL.createObjectURL(selectedFile);
        finalPdfName = selectedFile.name;
      }
    }

    const featureList = formFeatures
      .split('\n')
      .map(f => f.trim())
      .filter(f => f.length > 0);

    const resourceId = editingResource ? editingResource.id : `academy-${Date.now()}`;

    const newResource: AcademyResource = {
      id: resourceId,
      title: formTitle.trim(),
      stream: formStream.trim(),
      badge: formBadge.trim(),
      description: formDescription.trim() || 'Comprehensive State Board 11th-grade revision reference kit.',
      features: featureList.length > 0 ? featureList : ['Complete chapter breakdown', 'High-yield examiner notes', 'Solved model questions'],
      chapters: editingResource?.chapters || [
        { name: 'Unit 1: Foundational Framework & Core Principles', detail: 'Essential theories, step-by-step illustrations, and model exercises.' },
        { name: 'Unit 2: Applied Analysis & Format Blueprints', detail: 'Step-by-step methodologies and practical problem-solving procedures.' },
        { name: 'Unit 3: Board Exam High-Yield Revision Sprint', detail: 'Frequently asked questions, common mistakes, and answer formatting.' }
      ],
      examTips: editingResource?.examTips || [
        'Review high-priority concepts 15 minutes before your daily study session.',
        'Write answers strictly under timed conditions to simulate board exam hall settings.',
        'Structure all answers with highlighted key headings for maximum examiner marks.'
      ],
      docPages: Number(formDocPages) || 45,
      tier: formTier,
      priceINR: formTier === 'free' ? 0 : Number(formPriceINR),
      pdfUrl: finalPdfUrl,
      pdfFileName: finalPdfName,
      updatedAt: new Date().toISOString()
    };

    try {
      if (onSaveResource) {
        await onSaveResource(newResource);
      }

      setAcademyResources(prev => {
        const exists = prev.some(r => r.id === resourceId);
        const updated = exists 
          ? prev.map(r => r.id === resourceId ? newResource : r)
          : [...prev, newResource];
        
        try {
          localStorage.setItem('ocu_academy_resources', JSON.stringify(updated));
        } catch {
          // Ignore local storage quota limits
        }
        return updated;
      });

      setFormSuccess(editingResource ? 'Resource updated successfully!' : 'New study material published successfully!');
      setTimeout(() => {
        setIsAddingOrEditing(false);
        setEditingResource(null);
      }, 1000);
    } catch (err) {
      console.error('Failed to save academy resource:', err);
      setFormError('Failed to save study material: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Resource - Directly executes and updates UI and storage immediately
  const handleDeleteResource = async (id: string, index: number, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    setDeletingId(id);
    const targetResource = academyResources.find((r, idx) => r.id === id || idx === index);
    const titleToRemove = targetResource ? targetResource.title : 'Study material';

    try {
      // 1. Immediately update component and parent state array so card vanishes instantly from UI
      setAcademyResources(prev => {
        const filtered = prev.filter((r, idx) => r.id !== id && idx !== index);
        try {
          localStorage.setItem('ocu_academy_resources', JSON.stringify(filtered));
          localStorage.setItem('ocu_academy_initialized', 'true');
        } catch (storageErr) {
          console.warn('LocalStorage error:', storageErr);
        }
        return filtered;
      });

      // 2. Trigger parent onDeleteResource callback to sync Firestore and App level state
      if (onDeleteResource) {
        await onDeleteResource(id, index);
      }

      setDeleteNotification(`"${titleToRemove}" removed successfully.`);
      setTimeout(() => setDeleteNotification(null), 3500);
    } catch (err) {
      console.error('Failed to delete academy resource:', err);
      setDeleteNotification('Notice: Resource was removed locally from current session.');
      setTimeout(() => setDeleteNotification(null), 3000);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <motion.div
      key="tab-academy-management"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8 text-left"
    >
      {/* 1. Header & Quick Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[10px] tracking-[0.25em] text-ocu-gold font-bold uppercase">
              ACADEMIC CONTROL NODE
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <h2 className="font-display font-black text-2xl md:text-3xl text-white uppercase tracking-wider">
            OCU ACADEMY MANAGEMENT
          </h2>
          <p className="font-sans text-xs text-ocu-gray">
            Configure the user-facing section heading, upload curriculum PDF documents, and manage free or paid (₹ INR) tiers.
          </p>
        </div>

        <button
          id="btn-add-academy-resource"
          onClick={handleOpenAdd}
          className="px-5 py-2.5 bg-gradient-to-r from-ocu-crimson to-red-700 hover:from-ocu-gold hover:to-amber-500 text-white hover:text-black rounded-lg text-xs font-display font-bold tracking-widest uppercase flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-ocu-crimson/20 transition-all duration-300"
        >
          <Plus size={16} />
          <span>ADD STUDY MATERIAL</span>
        </button>
      </div>

      {/* 2. Custom Heading Control Card */}
      <div className="bg-[#12121c] border border-white/10 rounded-xl p-6 space-y-4 shadow-xl relative overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-ocu-gold/10 text-ocu-gold border border-ocu-gold/20">
            <Edit3 size={18} />
          </div>
          <div>
            <h3 className="font-display font-bold text-base text-white uppercase tracking-wide">
              1. Custom Heading Control
            </h3>
            <p className="font-sans text-xs text-ocu-gray">
              Dynamically customize the main heading displayed on the user-facing OCU Academy section.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveHeading} className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <input
                id="academy-heading-input"
                type="text"
                value={headingText}
                onChange={(e) => setHeadingText(e.target.value)}
                placeholder="e.g. OCU ACADEMY or STATE BOARD PREP HUB"
                className="w-full bg-black/50 border border-white/15 focus:border-ocu-gold rounded-lg px-4 py-3 text-sm text-white font-display font-bold uppercase tracking-wider outline-none transition-colors"
              />
            </div>
            <button
              id="btn-save-academy-heading"
              type="submit"
              disabled={isSavingHeading || !headingText.trim()}
              className="px-6 py-3 bg-white/10 hover:bg-ocu-gold hover:text-black text-white rounded-lg text-xs font-display font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
            >
              {isSavingHeading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Save Heading</span>
                </>
              )}
            </button>
          </div>

          {/* Live Preview Indicator */}
          <div className="flex items-center gap-2 font-mono text-[11px] text-white/50 bg-black/30 p-2.5 rounded-md border border-white/5">
            <span className="text-ocu-gold font-bold">LIVE PREVIEW:</span>
            <span className="text-white font-display font-bold uppercase">{headingText || 'OCU ACADEMY'}</span>
          </div>

          {headingSuccess && (
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-950/20 border border-emerald-500/30 p-2.5 rounded-md">
              <CheckCircle size={14} />
              <span>{headingSuccess}</span>
            </div>
          )}
        </form>
      </div>

      {/* 3. Published Academic Materials List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-lg text-white uppercase tracking-wide flex items-center gap-2">
              <BookOpen size={18} className="text-ocu-gold" />
              <span>Curriculum Study Materials ({academyResources.length})</span>
            </h3>
            <p className="font-sans text-xs text-ocu-gray">
              Each resource below displays live pricing, tier, and linked PDF download assets.
            </p>
          </div>
        </div>

        {/* Delete notification feedback banner */}
        {deleteNotification && (
          <div className="flex items-center gap-2 text-xs font-mono text-rose-400 bg-rose-950/30 border border-rose-500/30 p-3 rounded-lg shadow-lg">
            <Trash2 size={14} className="shrink-0" />
            <span>{deleteNotification}</span>
          </div>
        )}

        {academyResources.length === 0 ? (
          <div className="bg-[#12121c] border border-dashed border-white/15 rounded-xl p-12 text-center space-y-4">
            <GraduationCap className="mx-auto text-white/30" size={36} />
            <div className="space-y-1">
              <p className="font-display text-base text-white uppercase font-bold">No Curriculum Study Materials</p>
              <p className="font-sans text-xs text-ocu-gray">Click "Add Study Material" above to upload and publish new 11th-grade revision notes or guides.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {academyResources.map((res, index) => (
              <div
                key={res.id || `academy-${index}`}
                id={`admin-academy-card-${res.id || index}`}
                className="bg-[#12121c] border border-white/10 hover:border-white/20 rounded-xl p-6 flex flex-col justify-between space-y-5 transition-all shadow-md"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[9px] uppercase font-bold text-ocu-gold bg-ocu-gold/10 border border-ocu-gold/20 px-2.5 py-0.5 rounded">
                      {res.badge}
                    </span>

                    {/* Pricing & Tier Badge */}
                    {res.tier === 'paid' && res.priceINR > 0 ? (
                      <span className="font-mono text-xs font-bold text-amber-400 bg-amber-950/40 border border-amber-500/30 px-2.5 py-0.5 rounded flex items-center gap-1">
                        <IndianRupee size={12} />
                        <span>{res.priceINR}</span>
                      </span>
                    ) : (
                      <span className="font-mono text-[10px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-0.5 rounded">
                        FREE TIER
                      </span>
                    )}
                  </div>

                  <div>
                    <p className="font-mono text-[10px] text-white/50 uppercase tracking-widest">{res.stream}</p>
                    <h4 className="font-display font-bold text-base text-white uppercase tracking-tight mt-0.5">
                      {res.title}
                    </h4>
                  </div>

                  <p className="font-sans text-xs text-ocu-gray line-clamp-2 leading-relaxed">
                    {res.description}
                  </p>

                  {/* PDF File Link Indicator */}
                  <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 space-y-1">
                    <div className="flex items-center gap-2 font-mono text-[10px]">
                      <FileText size={13} className={res.pdfUrl || res.pdfFileName ? "text-emerald-400" : "text-white/30"} />
                      <span className="text-white/60">PDF Asset:</span>
                      <span className={res.pdfUrl || res.pdfFileName ? "text-emerald-400 font-semibold truncate" : "text-white/40 italic"}>
                        {res.pdfFileName || (res.pdfUrl ? "Cloud PDF Attached" : "None uploaded")}
                      </span>
                    </div>
                    {res.docPages && (
                      <div className="font-mono text-[9px] text-white/40 pl-5">
                        Length: {res.docPages} Pages
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(res)}
                    className="flex-1 py-2 px-3 bg-white/5 hover:bg-white/10 text-white rounded-lg font-display text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Edit3 size={13} />
                    <span>Edit / PDF</span>
                  </button>
                  <button
                    id={`btn-delete-academy-${res.id || index}`}
                    type="button"
                    disabled={deletingId === res.id}
                    onClick={(e) => handleDeleteResource(res.id, index, e)}
                    className="p-2 bg-rose-950/20 hover:bg-rose-900/40 text-rose-400 border border-rose-500/20 hover:border-rose-500/50 rounded-lg cursor-pointer transition-colors disabled:opacity-50 flex items-center justify-center shrink-0"
                    title="Remove Material"
                    aria-label={`Delete ${res.title}`}
                  >
                    {deletingId === res.id ? (
                      <RefreshCw size={15} className="animate-spin text-rose-400" />
                    ) : (
                      <Trash2 size={15} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Modal for Add / Edit Study Material with PDF Upload & Tier/Pricing */}
      <AnimatePresence>
        {isAddingOrEditing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
            onClick={() => setIsAddingOrEditing(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-2xl bg-[#11111c] border border-white/15 rounded-2xl p-6 sm:p-8 text-left shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h3 className="font-display font-black text-xl text-white uppercase tracking-wider flex items-center gap-2">
                    <GraduationCap className="text-ocu-gold" size={20} />
                    <span>{editingResource ? 'Edit Study Material' : 'Upload New Study Material'}</span>
                  </h3>
                  <p className="font-sans text-xs text-ocu-gray">
                    Configure curriculum details, attach PDF documents, and set Free or ₹ INR pricing.
                  </p>
                </div>
                <button
                  onClick={() => setIsAddingOrEditing(false)}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmitResource} className="space-y-5">
                {/* Title */}
                <div className="space-y-1.5">
                  <label className="block font-mono text-[10px] uppercase tracking-wider text-ocu-gray font-bold">
                    Resource Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. 11th-Grade Accountancy Revision (State Board)"
                    className="w-full bg-black/50 border border-white/10 focus:border-ocu-gold rounded-lg px-4 py-2.5 text-xs text-white outline-none"
                  />
                </div>

                {/* Stream and Badge */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block font-mono text-[10px] uppercase tracking-wider text-ocu-gray font-bold">
                      Academic Stream / Category
                    </label>
                    <input
                      type="text"
                      value={formStream}
                      onChange={(e) => setFormStream(e.target.value)}
                      placeholder="e.g. Commerce Stream or Literature"
                      className="w-full bg-black/50 border border-white/10 focus:border-ocu-gold rounded-lg px-4 py-2.5 text-xs text-white outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block font-mono text-[10px] uppercase tracking-wider text-ocu-gray font-bold">
                      Badge Label
                    </label>
                    <input
                      type="text"
                      value={formBadge}
                      onChange={(e) => setFormBadge(e.target.value)}
                      placeholder="e.g. State Board Syllabus"
                      className="w-full bg-black/50 border border-white/10 focus:border-ocu-gold rounded-lg px-4 py-2.5 text-xs text-white outline-none"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="block font-mono text-[10px] uppercase tracking-wider text-ocu-gray font-bold">
                    Summary / Description
                  </label>
                  <textarea
                    rows={3}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Master double-entry bookkeeping, trial balance adjustments, and financial statements..."
                    className="w-full bg-black/50 border border-white/10 focus:border-ocu-gold rounded-lg px-4 py-2.5 text-xs text-white outline-none resize-none"
                  />
                </div>

                {/* FEATURE 2: PDF FILE UPLOAD (Native Mobile File Picker) */}
                <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-mono text-xs uppercase tracking-wider text-white font-bold flex items-center gap-1.5">
                        <UploadCloud size={14} className="text-ocu-crimson" />
                        <span>2. PDF Document Upload</span>
                      </h4>
                      <p className="font-sans text-[11px] text-ocu-gray">
                        Tapping "Select PDF" natively opens your device's file manager on phones and desktops.
                      </p>
                    </div>
                    {formDocPages && (
                      <div className="text-right">
                        <span className="font-mono text-[10px] text-white/50">Est. Pages:</span>
                        <input
                          type="number"
                          min="1"
                          value={formDocPages}
                          onChange={(e) => setFormDocPages(Number(e.target.value))}
                          className="w-16 ml-2 bg-black/60 border border-white/15 rounded px-2 py-1 text-xs text-white font-mono text-center outline-none"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                    {/* Native <input type="file" accept="application/pdf"> */}
                    <input
                      ref={fileInputRef}
                      id="pdf-file-native-input"
                      type="file"
                      accept="application/pdf"
                      onChange={handlePdfChange}
                      className="hidden"
                    />

                    <button
                      type="button"
                      id="btn-select-pdf"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-ocu-crimson to-red-700 hover:from-ocu-gold hover:to-amber-500 text-white hover:text-black rounded-lg text-xs font-display font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all duration-300"
                    >
                      <UploadCloud size={15} />
                      <span>Select PDF</span>
                    </button>

                    <div className="flex-1 text-left w-full sm:w-auto overflow-hidden">
                      {selectedFile ? (
                        <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono truncate">
                          <CheckCircle size={14} className="shrink-0" />
                          <span className="truncate">{selectedFile.name}</span>
                          <span className="text-[10px] text-white/50">({Math.round(selectedFile.size / 1024)} KB)</span>
                        </div>
                      ) : pdfFileName ? (
                        <div className="flex items-center gap-2 text-xs text-ocu-gold font-mono truncate">
                          <FileText size={14} className="shrink-0" />
                          <span className="truncate">Current: {pdfFileName}</span>
                        </div>
                      ) : (
                        <span className="font-mono text-[11px] text-white/40 italic">
                          No PDF selected yet. Tap "Select PDF" to browse device files.
                        </span>
                      )}
                    </div>
                  </div>

                  {uploadProgress !== null && (
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-[10px] font-mono text-ocu-gold">
                        <span>{uploadStatus}</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-ocu-crimson to-ocu-gold transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* FEATURE 3: PRICING & TIER SYSTEM (Free / Paid in ₹ INR) */}
                <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
                  <h4 className="font-mono text-xs uppercase tracking-wider text-white font-bold flex items-center gap-1.5">
                    <IndianRupee size={14} className="text-ocu-gold" />
                    <span>3. Pricing & Tier System</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    {/* Tier Dropdown / Selector */}
                    <div className="space-y-1.5">
                      <label className="block font-mono text-[10px] uppercase tracking-wider text-ocu-gray">
                        Access Tier
                      </label>
                      <select
                        id="select-access-tier"
                        value={formTier}
                        onChange={(e) => {
                          const val = e.target.value as 'free' | 'paid';
                          setFormTier(val);
                          if (val === 'free') setFormPriceINR(0);
                          else if (formPriceINR === 0) setFormPriceINR(199);
                        }}
                        className="w-full bg-black/60 border border-white/15 focus:border-ocu-gold rounded-lg px-3 py-2 text-xs text-white outline-none cursor-pointer"
                      >
                        <option value="free">Free Tier (Open to All Students)</option>
                        <option value="paid">Paid Tier (Direct Purchase / Access)</option>
                      </select>
                    </div>

                    {/* Price in Indian Rupees (₹) Number Field */}
                    <div className="space-y-1.5">
                      <label className="block font-mono text-[10px] uppercase tracking-wider text-ocu-gray">
                        Price in Indian Rupees (₹)
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ocu-gold font-bold">
                          ₹
                        </div>
                        <input
                          id="input-price-inr"
                          type="number"
                          min="0"
                          step="1"
                          disabled={formTier === 'free'}
                          value={formTier === 'free' ? 0 : formPriceINR}
                          onChange={(e) => setFormPriceINR(Math.max(0, Number(e.target.value)))}
                          placeholder="e.g. 199"
                          className={`w-full bg-black/60 border rounded-lg pl-8 pr-4 py-2 text-xs text-white font-mono outline-none ${
                            formTier === 'free' 
                              ? 'border-white/5 text-white/30 cursor-not-allowed' 
                              : 'border-white/15 focus:border-ocu-gold'
                          }`}
                        />
                      </div>
                      <p className="font-mono text-[9px] text-white/40">
                        {formTier === 'free' ? 'Free materials show a "Free" badge.' : 'Displays price tag in ₹ INR on student cards.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Key Revision Highlights */}
                <div className="space-y-1.5">
                  <label className="block font-mono text-[10px] uppercase tracking-wider text-ocu-gray font-bold">
                    Key Revision Highlights (One per line)
                  </label>
                  <textarea
                    rows={3}
                    value={formFeatures}
                    onChange={(e) => setFormFeatures(e.target.value)}
                    placeholder="Golden Rules of Accounting&#10;Depreciation Methods Guide&#10;Rectification of Errors Worksheets"
                    className="w-full bg-black/50 border border-white/10 focus:border-ocu-gold rounded-lg px-4 py-2 text-xs text-white outline-none font-sans"
                  />
                </div>

                {/* Feedback Alerts */}
                {formError && (
                  <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-950/30 border border-rose-500/30 p-3 rounded-lg font-mono">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {formSuccess && (
                  <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-500/30 p-3 rounded-lg font-mono">
                    <CheckCircle size={14} className="shrink-0" />
                    <span>{formSuccess}</span>
                  </div>
                )}

                {/* Submit Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsAddingOrEditing(false)}
                    className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/70 rounded-lg text-xs font-display font-medium uppercase cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-gradient-to-r from-ocu-crimson to-red-700 hover:from-ocu-gold hover:to-amber-500 text-white hover:text-black rounded-lg text-xs font-display font-bold uppercase tracking-wider cursor-pointer transition-all duration-300 flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Saving Changes...</span>
                      </>
                    ) : (
                      <>
                        <Save size={14} />
                        <span>{editingResource ? 'Save Updates' : 'Publish Resource'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ShieldAlert, 
  UserX, 
  UserCheck, 
  AlertTriangle, 
  Trash2, 
  Smartphone, 
  RefreshCw, 
  Mail, 
  CheckCircle,
  Database,
  Lock
} from 'lucide-react';
import { ComicVolume, AcademyResource, Order } from '../types';
import { 
  supabase, 
  isSupabaseConfigured,
  fetchAllUserProfiles, 
  UserProfile, 
  revokeUserItemAccess, 
  banUserAccount, 
  unbanUserAccount, 
  banUserDeviceByEmail,
  unbanUserDeviceByEmail,
  banDevicePermanently
} from '../lib/supabase';

interface UserManagementAdminProps {
  comics: ComicVolume[];
  academyResources: AcademyResource[];
  orders?: Order[];
  setOrders?: React.Dispatch<React.SetStateAction<Order[]>>;
  showToast?: (message: string, type: 'info' | 'warning' | 'error' | 'success', title?: string) => void;
}

export default function UserManagementAdmin({
  comics,
  academyResources,
  orders,
  setOrders,
  showToast
}: UserManagementAdminProps) {
  const [targetEmail, setTargetEmail] = useState<string>('');
  const [targetItem, setTargetItem] = useState<string>('');
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);

  // Set default target item
  useEffect(() => {
    if (!targetItem) {
      if (comics.length > 0) {
        setTargetItem(comics[0].id);
      } else if (academyResources.length > 0) {
        setTargetItem(academyResources[0].id);
      }
    }
  }, [comics, academyResources, targetItem]);

  // Load user profiles for administrative oversight
  const loadProfiles = async () => {
    setIsLoadingProfiles(true);
    try {
      const list = await fetchAllUserProfiles();
      setProfiles(list);
    } catch (err) {
      console.warn('Could not load user profiles:', err);
    } finally {
      setIsLoadingProfiles(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const notify = (msg: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', title?: string) => {
    setStatusMessage({ text: msg, type });
    if (showToast) {
      showToast(msg, type, title);
    }
  };

  // BUTTON 1: "Revoke Item Access" (Warning color)
  const handleRevokeItemAccess = async () => {
    if (!targetEmail.trim()) {
      notify("Please enter target user's Gmail ID first.", 'warning', 'Target Required');
      return;
    }
    if (!targetItem) {
      notify("Please select target Comic or Academy PDF.", 'warning', 'Item Required');
      return;
    }

    setIsProcessing('revoke');
    try {
      // Execute the revocation logic
      const res = await revokeUserItemAccess(targetEmail, targetItem);
      if (res.success) {
        // Update local state orders if available
        if (setOrders) {
          setOrders(prev => prev.filter(o => 
            !(o.customerEmail?.toLowerCase() === targetEmail.trim().toLowerCase() && (o.comicId === targetItem || o.id === targetItem))
          ));
        }
        notify(res.message, 'warning', 'Access Revoked');
      } else {
        notify(res.message, 'error', 'Action Failed');
      }
    } catch (err: any) {
      notify(err.message || "Failed to revoke item access.", 'error');
    } finally {
      setIsProcessing(null);
    }
  };

  // BUTTON 2: "Ban Account" (Red color)
  const handleBanAccount = async () => {
    if (!targetEmail.trim()) {
      notify("Please enter target user's Gmail ID first.", 'warning', 'Target Required');
      return;
    }

    setIsProcessing('ban_account');
    try {
      const res = await banUserAccount(targetEmail);
      if (res.success) {
        // Update local list
        setProfiles(prev => prev.map(p => 
          p.email.toLowerCase() === targetEmail.trim().toLowerCase() 
            ? { ...p, is_banned: true } 
            : p
        ));
        notify(res.message, 'error', 'Account Banned');
      } else {
        notify(res.message, 'error', 'Action Failed');
      }
    } catch (err: any) {
      notify(err.message || "Failed to ban account.", 'error');
    } finally {
      setIsProcessing(null);
    }
  };

  // BUTTON 3: "Unban Account" (Green color)
  const handleUnbanAccount = async () => {
    if (!targetEmail.trim()) {
      notify("Please enter target user's Gmail ID first.", 'warning', 'Target Required');
      return;
    }

    setIsProcessing('unban_account');
    try {
      const res = await unbanUserAccount(targetEmail);
      if (res.success) {
        // Update local list
        setProfiles(prev => prev.map(p => 
          p.email.toLowerCase() === targetEmail.trim().toLowerCase() 
            ? { ...p, is_banned: false } 
            : p
        ));
        notify(res.message, 'success', 'Account Restored');
      } else {
        notify(res.message, 'error', 'Action Failed');
      }
    } catch (err: any) {
      notify(err.message || "Failed to unban account.", 'error');
    } finally {
      setIsProcessing(null);
    }
  };

  // BUTTON 4: "Ban Device - PERMANENT" (Dark Red/Black color)
  const handleBanDevicePermanent = async () => {
    if (!targetEmail.trim()) {
      notify("Please enter target user's Gmail ID first.", 'warning', 'Target Required');
      return;
    }

    setIsProcessing('ban_device');
    try {
      const res = await banUserDeviceByEmail(targetEmail);
      if (res.success) {
        notify(res.message, 'error', 'Device Blacklisted');
      } else {
        notify(res.message, 'warning', 'Device Not Found');
      }
    } catch (err: any) {
      notify(err.message || "Failed to blacklist device.", 'error');
    } finally {
      setIsProcessing(null);
    }
  };

  // BUTTON 5: "Unban Device" (Safe color like green or blue)
  const handleUnbanDevice = async () => {
    if (!targetEmail.trim()) {
      notify("Please enter target user's Gmail ID first.", 'warning', 'Target Required');
      return;
    }

    setIsProcessing('unban_device');
    try {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase client is not configured');
      }

      // Query the profiles table to retrieve that user's device_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('device_id')
        .eq('email', targetEmail.trim())
        .single();

      if (profileError || !profile || !profile.device_id) {
        throw new Error('User profile or device ID not found');
      }

      // If a device_id is found, execute a DELETE query on the banned_devices table
      const { error: deleteError } = await supabase
        .from('banned_devices')
        .delete()
        .eq('device_id', profile.device_id);

      if (deleteError) {
        throw deleteError;
      }

      // Also clean up local fallback cache
      try {
        const cached = localStorage.getItem('ocu_banned_devices_list');
        if (cached) {
          let list = JSON.parse(cached);
          if (Array.isArray(list)) {
            list = list.filter((d: string) => d !== profile.device_id);
            localStorage.setItem('ocu_banned_devices_list', JSON.stringify(list));
          }
        }
      } catch {}

      notify("Device successfully unbanned. The user can now access the app again.", 'success', 'Device Unbanned');
    } catch (err: any) {
      console.error('Failed to unban device:', err);
      notify("Failed to unban device.", 'error', 'Unban Failed');
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div id="section-user-management-anti-piracy" className="space-y-8 text-left max-w-5xl mx-auto">
      {/* Top Heading Banner */}
      <div className="bg-gradient-to-r from-red-950/40 via-ocu-graphite to-black border border-red-500/20 rounded-xl p-6 sm:p-8 space-y-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldAlert className="text-ocu-crimson" size={22} />
              <span className="font-mono text-[10px] tracking-[0.25em] text-red-400 font-bold uppercase">
                SECURITY NODE // DRM & ACCESS CONTROL
              </span>
            </div>
            <h2 className="font-display font-black text-2xl sm:text-3xl text-white uppercase tracking-tight">
              User Management & Anti-Piracy
            </h2>
            <p className="font-sans text-xs text-ocu-gray max-w-2xl font-light">
              Revoke unauthorized item access, enforce instant account bans across all active sessions, 
              or permanently blacklist compromised hardware device fingerprints in Supabase.
            </p>
          </div>

          <button
            id="btn-refresh-user-profiles"
            onClick={loadProfiles}
            disabled={isLoadingProfiles}
            className="px-3.5 py-2 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-ocu-gray hover:text-white font-mono text-xs uppercase flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            title="Refresh User Registry"
          >
            <RefreshCw size={13} className={isLoadingProfiles ? 'animate-spin text-ocu-gold' : ''} />
            <span>Sync Profiles</span>
          </button>
        </div>

        {statusMessage && (
          <div 
            className={`p-3.5 rounded-lg border text-xs font-mono flex items-center justify-between gap-3 ${
              statusMessage.type === 'error'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : statusMessage.type === 'warning'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : statusMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === 'error' ? <AlertTriangle size={15} /> : <CheckCircle size={15} />}
              <span>{statusMessage.text}</span>
            </div>
            <button 
              onClick={() => setStatusMessage(null)}
              className="text-white/40 hover:text-white text-xs cursor-pointer font-bold px-1"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Main Control Suite Panel */}
      <div className="bg-ocu-graphite border border-white/10 rounded-xl p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="border-b border-white/10 pb-4">
          <h3 className="font-display font-bold text-lg text-white uppercase tracking-wider flex items-center gap-2">
            <Lock size={16} className="text-ocu-crimson" />
            <span>Target User Enforcement Operations</span>
          </h3>
          <p className="font-sans text-xs text-ocu-gray mt-1">
            Specify the target user's Gmail ID and select the target digital asset to execute administrative protocols.
          </p>
        </div>

        {/* 1. UI Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Target Email Input */}
          <div className="space-y-2">
            <label htmlFor="input-target-email" className="block font-mono text-[11px] text-ocu-gold font-bold tracking-wider uppercase">
              Enter Target User's Gmail ID
            </label>
            <div className="relative">
              <input
                id="input-target-email"
                type="email"
                required
                placeholder="e.g. reader@gmail.com"
                value={targetEmail}
                onChange={(e) => setTargetEmail(e.target.value)}
                className="w-full bg-black/50 border border-white/15 rounded-lg px-4 py-3 pl-10 font-mono text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-ocu-crimson focus:ring-1 focus:ring-ocu-crimson transition-all"
              />
              <Mail size={16} className="absolute left-3.5 top-3.5 text-neutral-400 pointer-events-none" />
            </div>
            <span className="block font-mono text-[10px] text-neutral-400">
              * Exact email matching user profile record in database
            </span>
          </div>

          {/* Target Item Dropdown */}
          <div className="space-y-2">
            <label htmlFor="select-target-item" className="block font-mono text-[11px] text-ocu-gold font-bold tracking-wider uppercase">
              Select Target Asset (Comic or Academy PDF)
            </label>
            <div className="relative">
              <select
                id="select-target-item"
                value={targetItem}
                onChange={(e) => setTargetItem(e.target.value)}
                className="w-full bg-black/50 border border-white/15 rounded-lg px-4 py-3 font-sans text-sm text-white focus:outline-none focus:border-ocu-crimson focus:ring-1 focus:ring-ocu-crimson transition-all cursor-pointer"
              >
                <option value="" disabled>-- Select Comic or Academy PDF --</option>
                <optgroup label="── OCU Comic Releases ──" className="bg-neutral-900 text-white font-bold">
                  {comics.map((comic) => (
                    <option key={`comic-${comic.id}`} value={comic.id} className="bg-neutral-900 text-neutral-200 py-1">
                      [Comic Vol. {comic.volumeNumber}] {comic.title} (₹{comic.price})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="── OCU Academy Study Notes ──" className="bg-neutral-900 text-white font-bold">
                  {academyResources.map((res) => (
                    <option key={`res-${res.id}`} value={res.id} className="bg-neutral-900 text-neutral-200 py-1">
                      [Academy PDF] {res.title} - {res.badge || res.stream} (₹{res.priceINR})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
            <span className="block font-mono text-[10px] text-neutral-400">
              * Target item ID to revoke from purchases and orders
            </span>
          </div>
        </div>

        {/* 2. Action Buttons & Supabase Queries */}
        <div className="border-t border-white/10 pt-6 space-y-3">
          <span className="block font-mono text-[10px] tracking-widest text-neutral-400 uppercase font-bold">
            EXECUTE SECURITY ACTION
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
            {/* BUTTON 1: "Revoke Item Access" (Warning color) */}
            <button
              id="btn-revoke-item-access"
              onClick={handleRevokeItemAccess}
              disabled={isProcessing !== null}
              className="px-4 py-3.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 hover:text-amber-200 rounded-lg font-display font-bold text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-950/20 disabled:opacity-50"
            >
              <Trash2 size={15} className={isProcessing === 'revoke' ? 'animate-spin' : ''} />
              <span>{isProcessing === 'revoke' ? 'Revoking...' : 'Revoke Item Access'}</span>
            </button>

            {/* BUTTON 2: "Ban Account" (Red color) */}
            <button
              id="btn-ban-account"
              onClick={handleBanAccount}
              disabled={isProcessing !== null}
              className="px-4 py-3.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-display font-bold text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-red-950/40 disabled:opacity-50"
            >
              <UserX size={15} className={isProcessing === 'ban_account' ? 'animate-spin' : ''} />
              <span>{isProcessing === 'ban_account' ? 'Banning...' : 'Ban Account'}</span>
            </button>

            {/* BUTTON 3: "Unban Account" (Green color) */}
            <button
              id="btn-unban-account"
              onClick={handleUnbanAccount}
              disabled={isProcessing !== null}
              className="px-4 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-black rounded-lg font-display font-bold text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/40 disabled:opacity-50"
            >
              <UserCheck size={15} className={isProcessing === 'unban_account' ? 'animate-spin' : ''} />
              <span>{isProcessing === 'unban_account' ? 'Restoring...' : 'Unban Account'}</span>
            </button>

            {/* BUTTON 4: "Ban Device - PERMANENT" (Dark Red/Black color) */}
            <button
              id="btn-ban-device-permanent"
              onClick={handleBanDevicePermanent}
              disabled={isProcessing !== null}
              className="px-4 py-3.5 bg-black hover:bg-neutral-950 border-2 border-red-700 text-red-400 hover:text-red-300 rounded-lg font-display font-black text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-xl shadow-red-950/50 disabled:opacity-50"
            >
              <Smartphone size={15} className={isProcessing === 'ban_device' ? 'animate-spin' : ''} />
              <span>{isProcessing === 'ban_device' ? 'Blacklisting...' : 'Ban Device'}</span>
            </button>

            {/* BUTTON 5: "Unban Device" (Safe Blue/Emerald color) */}
            <button
              id="btn-unban-device"
              onClick={handleUnbanDevice}
              disabled={isProcessing !== null}
              className="px-4 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-display font-bold text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-950/40 disabled:opacity-50"
            >
              <Smartphone size={15} className={isProcessing === 'unban_device' ? 'animate-spin' : ''} />
              <span>{isProcessing === 'unban_device' ? 'Unbanning...' : 'Unban Device'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* User Profiles Quick-Selection and Registry Overview */}
      <div className="bg-ocu-graphite border border-white/10 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h4 className="font-display font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
              <Database size={15} className="text-ocu-gold" />
              <span>Captured Profiles & Device Fingerprints</span>
            </h4>
            <p className="font-sans text-xs text-neutral-400">
              Click any user row below to instantly populate their email into the enforcement target field.
            </p>
          </div>
          <span className="font-mono text-[10px] text-ocu-gold uppercase bg-black/40 px-2.5 py-1 rounded border border-white/5">
            {profiles.length} Registered
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-neutral-400 font-mono text-[10px] uppercase">
                <th className="py-2.5 px-3">User / Email</th>
                <th className="py-2.5 px-3">Device Fingerprint</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Last Active</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-xs">
              {profiles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-neutral-500 font-sans text-xs">
                    {isLoadingProfiles ? 'Loading user profiles...' : 'No user profiles recorded in Supabase profiles table yet.'}
                  </td>
                </tr>
              ) : (
                profiles.map((p) => {
                  const isSelected = targetEmail.toLowerCase() === p.email.toLowerCase();
                  const isBanned = p.is_banned === true;
                  return (
                    <tr 
                      key={p.user_id || p.email}
                      onClick={() => setTargetEmail(p.email)}
                      className={`hover:bg-white/[0.04] transition-colors cursor-pointer ${
                        isSelected ? 'bg-ocu-crimson/10 border-l-2 border-ocu-crimson' : ''
                      }`}
                    >
                      <td className="py-3 px-3">
                        <div className="flex flex-col">
                          <span className="font-sans font-medium text-white">{p.display_name || 'Anonymous User'}</span>
                          <span className="text-[11px] text-neutral-400 font-mono">{p.email}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px]">
                        {p.device_id ? (
                          <span className="text-neutral-300 truncate max-w-[140px] inline-block" title={p.device_id}>
                            {p.device_id.substring(0, 14)}...
                          </span>
                        ) : (
                          <span className="text-neutral-600 italic">Not Captured</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {isBanned ? (
                          <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                            BANNED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px]">
                            ACTIVE
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-[11px] text-neutral-400">
                        {p.last_login ? new Date(p.last_login).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTargetEmail(p.email);
                          }}
                          className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-ocu-gold hover:text-white rounded border border-white/10 text-[10px] uppercase cursor-pointer"
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

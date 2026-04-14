import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  Clock3,
  Film,
  Gamepad2,
  Heart,
  LogOut,
  Pencil,
  RefreshCw,
  Search,
  Star,
  Tv,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { shelfService } from '../services/shelfService';
import { userService } from '../services/userService';
import { FriendRequest, MediaType, Status, UserMedia, UserProfile, UserSearchResult, UserSummary } from '../types';

const statusGroups = {
  inProgress: new Set([Status.WATCHING, Status.READING, Status.PLAYING]),
  planned: new Set([Status.PLAN_TO_WATCH, Status.PLAN_TO_READ, Status.PLAN_TO_PLAY]),
};

const croodlesUrl = (seed: string) => `https://api.dicebear.com/9.x/croodles/svg?seed=${encodeURIComponent(seed)}`;

const Profile: React.FC = () => {
  const { username: routeUsername } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user, login, logout } = useAuth();
  const isViewingOtherUser = !!routeUsername && routeUsername.toLowerCase() !== (user?.username || '').toLowerCase();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [allData, setAllData] = useState<UserMedia[]>([]);
  const [friends, setFriends] = useState<UserSummary[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [usernameDraft, setUsernameDraft] = useState('');
  const [bioDraft, setBioDraft] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<string>('');
  const [customSeed, setCustomSeed] = useState('');
  const [avatarBatch, setAvatarBatch] = useState(0);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingFriendAction, setSavingFriendAction] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const avatarOptions = useMemo(() => {
    const base = profile?.username || user?.username || 'shelf-user';
    return Array.from({ length: 12 }, (_, index) => croodlesUrl(`${base}-${avatarBatch}-${index + 1}`));
  }, [avatarBatch, profile?.username, user?.username]);

  const isMe = !!profile?.me && !isViewingOtherUser;

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError('');
      setInfoMessage('');
      try {
        const profilePromise = routeUsername
          ? userService.getProfileByUsername(routeUsername)
          : userService.getMyProfile();

        const [profileData, shelfData] = await Promise.all([
          profilePromise,
          routeUsername ? Promise.resolve<UserMedia[]>([]) : shelfService.getUserShelf(),
        ]);

        if (mounted) {
          setProfile(profileData);
          setAllData(shelfData);
          setUsernameDraft(profileData.username || '');
          setBioDraft(profileData.bio || '');
          setSelectedAvatar(profileData.avatarUrl || croodlesUrl(profileData.username));
        }

        if (!routeUsername) {
          const [friendsData, incomingData, outgoingData] = await Promise.all([
            userService.getFriends(),
            userService.getIncomingRequests(),
            userService.getOutgoingRequests(),
          ]);

          if (mounted) {
            setFriends(friendsData);
            setIncomingRequests(incomingData);
            setOutgoingRequests(outgoingData);
          }
        }
      } catch {
        if (mounted) {
          setError('Failed to load profile data');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [routeUsername]);

  const stats = useMemo(() => {
    const total = profile?.totalItems ?? allData.length;
    const favorites = allData.filter((item) => item.isFavorite).length;
    const completed = profile?.completedItems ?? allData.filter((item) => item.status === Status.COMPLETED).length;
    const onHold = allData.filter((item) => item.status === Status.ON_HOLD).length;
    const dropped = allData.filter((item) => item.status === Status.DROPPED).length;
    const inProgress = allData.filter((item) => statusGroups.inProgress.has(item.status)).length;
    const planned = allData.filter((item) => statusGroups.planned.has(item.status)).length;

    const ratings = allData.filter((item) => item.rating != null).map((item) => item.rating as number);
    const avgRating = ratings.length > 0
      ? ratings.reduce((acc, value) => acc + value, 0) / ratings.length
      : null;

    const typeCounts = {
      [MediaType.MOVIE]: allData.filter((item) => item.media.type === MediaType.MOVIE).length,
      [MediaType.TV_SERIES]: allData.filter((item) => item.media.type === MediaType.TV_SERIES).length,
      [MediaType.ANIME]: allData.filter((item) => item.media.type === MediaType.ANIME).length,
      [MediaType.BOOK]: allData.filter((item) => item.media.type === MediaType.BOOK).length,
      [MediaType.GAME]: allData.filter((item) => item.media.type === MediaType.GAME).length,
    };

    const recent = [...allData]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 6);

    return {
      total,
      favorites: profile?.favoriteItems ?? favorites,
      completed,
      onHold,
      dropped,
      inProgress,
      planned,
      avgRating,
      ratingsCount: ratings.length,
      typeCounts,
      recent,
    };
  }, [allData, profile]);

  const reloadFriendsData = async () => {
    const [friendsData, incomingData, outgoingData] = await Promise.all([
      userService.getFriends(),
      userService.getIncomingRequests(),
      userService.getOutgoingRequests(),
    ]);
    setFriends(friendsData);
    setIncomingRequests(incomingData);
    setOutgoingRequests(outgoingData);
  };

  const applyProfileUpdate = async (payload: { username: string; bio: string; avatarUrl: string }, successMessage: string) => {
    setSavingProfile(true);
    setError('');
    setInfoMessage('');
    try {
      const response = await userService.updateMyProfile(payload);
      const updated = response.profile;
      setProfile(updated);
      setUsernameDraft(updated.username || '');
      setBioDraft(updated.bio || '');
      setSelectedAvatar(updated.avatarUrl || croodlesUrl(updated.username));
      setInfoMessage(successMessage);

      login(response.token, {
        id: updated.id,
        username: updated.username,
        email: updated.email || user?.email || '',
        bio: updated.bio ?? null,
        avatarUrl: updated.avatarUrl ?? null,
      });

      if (routeUsername && routeUsername.toLowerCase() !== updated.username.toLowerCase()) {
        navigate(`/u/${updated.username}`, { replace: true });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    const nextUsername = usernameDraft.trim();
    if (!nextUsername) {
      setError('Username cannot be empty');
      return;
    }
    await applyProfileUpdate(
      {
        username: nextUsername,
        bio: bioDraft,
        avatarUrl: selectedAvatar,
      },
      'Profile updated'
    );
    setIsEditingProfile(false);
    setShowAvatarPicker(false);
  };

  const handleAvatarPick = async (avatarUrl: string) => {
    setSelectedAvatar(avatarUrl);
    if (!profile || !isMe) return;

    if (isEditingProfile) {
      return;
    }

    await applyProfileUpdate(
      {
        username: profile.username,
        bio: profile.bio || '',
        avatarUrl,
      },
      'Avatar updated'
    );
    setShowAvatarPicker(false);
  };

  const handleSearchUsers = async () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      return;
    }
    setError('');
    setInfoMessage('');
    try {
      const results = await userService.searchUsers(trimmed);
      setSearchResults(results);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to search users');
    }
  };

  const handleSendRequest = async (identifier: string) => {
    setSavingFriendAction(true);
    setError('');
    setInfoMessage('');
    try {
      await userService.sendFriendRequest(identifier);
      await reloadFriendsData();
      if (searchQuery.trim()) {
        await handleSearchUsers();
      }
      setInfoMessage('Friend request sent');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send request');
    } finally {
      setSavingFriendAction(false);
    }
  };

  const handleAcceptRequest = async (requestId: number) => {
    setSavingFriendAction(true);
    setError('');
    setInfoMessage('');
    try {
      await userService.acceptFriendRequest(requestId);
      await reloadFriendsData();
      if (searchQuery.trim()) {
        await handleSearchUsers();
      }
      setInfoMessage('Friend request accepted');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to accept request');
    } finally {
      setSavingFriendAction(false);
    }
  };

  const handleRejectOrCancel = async (requestId: number) => {
    setSavingFriendAction(true);
    setError('');
    setInfoMessage('');
    try {
      await userService.rejectOrCancelRequest(requestId);
      await reloadFriendsData();
      if (searchQuery.trim()) {
        await handleSearchUsers();
      }
      setInfoMessage('Request removed');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update request');
    } finally {
      setSavingFriendAction(false);
    }
  };

  const handleRemoveFriend = async (friendUserId: number) => {
    setSavingFriendAction(true);
    setError('');
    setInfoMessage('');
    try {
      await userService.removeFriend(friendUserId);
      await reloadFriendsData();
      if (searchQuery.trim()) {
        await handleSearchUsers();
      }
      setInfoMessage('Friend removed');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to remove friend');
    } finally {
      setSavingFriendAction(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-8">
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <p className="text-red-600 dark:text-red-400 text-sm">Profile not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-6 sm:py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to shelf
        </button>

        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-start sm:justify-between">
            <div className="flex gap-4 sm:items-start">
              <button
                type="button"
                onClick={() => {
                  if (!isMe) return;
                  setShowAvatarPicker((prev) => !prev);
                }}
                className={`${isMe ? 'cursor-pointer' : 'cursor-default'} rounded-xl`}
                title={isMe ? 'Click avatar to change' : profile.username}
                disabled={!isMe}
              >
                <img
                  src={profile.avatarUrl || croodlesUrl(profile.username)}
                  alt={profile.username}
                  className="w-20 h-20 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700"
                />
              </button>

              <div className="min-w-0">
                {isMe && isEditingProfile ? (
                  <>
                    <input
                      value={usernameDraft}
                      onChange={(e) => setUsernameDraft(e.target.value)}
                      className="w-full max-w-sm px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-lg font-semibold"
                      placeholder="Username"
                    />
                    {profile.email && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{profile.email}</p>
                    )}
                    <textarea
                      rows={3}
                      value={bioDraft}
                      onChange={(e) => setBioDraft(e.target.value)}
                      className="mt-2 w-full max-w-2xl px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
                      placeholder="Tell your friends what you are into..."
                    />
                  </>
                ) : (
                  <>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white break-words">{profile.username}</h1>
                    {!isViewingOtherUser && profile.email && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{profile.email}</p>
                    )}
                    {profile.bio && (
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 max-w-2xl">{profile.bio}</p>
                    )}
                  </>
                )}
              </div>
            </div>

            {isMe && (
              <div className="flex items-center gap-2">
                {isEditingProfile ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingProfile(false);
                        setUsernameDraft(profile.username);
                        setBioDraft(profile.bio || '');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      disabled={savingProfile}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-60"
                    >
                      <Check className="w-4 h-4" />
                      {savingProfile ? 'Saving...' : 'Save'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300"
                    >
                      <Pencil className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={logout}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-300 dark:border-red-700 text-sm text-red-600 dark:text-red-400"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {showAvatarPicker && isMe && (
            <div className="mt-4 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-sm text-gray-700 dark:text-gray-300">Pick a Croodles avatar</p>
                <button
                  type="button"
                  onClick={() => setAvatarBatch((prev) => prev + 1)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-xs text-gray-700 dark:text-gray-300"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  New set
                </button>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {avatarOptions.map((avatarUrl) => (
                  <button
                    type="button"
                    key={avatarUrl}
                    onClick={() => handleAvatarPick(avatarUrl)}
                    className={`rounded-lg border p-1 transition ${selectedAvatar === avatarUrl
                      ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900'
                      : 'border-gray-200 dark:border-gray-700'}`}
                  >
                    <img src={avatarUrl} alt="avatar option" className="w-full aspect-square rounded-md" />
                  </button>
                ))}
              </div>

              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <input
                  value={customSeed}
                  onChange={(e) => setCustomSeed(e.target.value)}
                  placeholder="Custom seed"
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    const seed = customSeed.trim();
                    if (!seed) return;
                    void handleAvatarPick(croodlesUrl(seed));
                  }}
                  className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm"
                >
                  Use seed
                </button>
              </div>
            </div>
          )}

          {error && (
            <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          {infoMessage && (
            <p className="mt-4 text-sm text-green-700 dark:text-green-400">{infoMessage}</p>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-5">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Total Items</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white mt-1">{stats.total}</p>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Favorites</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white mt-1">{stats.favorites}</p>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Completed</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white mt-1">{stats.completed}</p>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Friends</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white mt-1">{profile.friendsCount}</p>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Avg Rating</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white mt-1">
                {stats.avgRating != null ? stats.avgRating.toFixed(1) : '--'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {stats.ratingsCount} ratings
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Collection Status</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between text-gray-700 dark:text-gray-300">
                <span className="inline-flex items-center gap-2"><Clock3 className="w-4 h-4" /> In Progress</span>
                <span>{stats.inProgress}</span>
              </div>
              <div className="flex items-center justify-between text-gray-700 dark:text-gray-300">
                <span className="inline-flex items-center gap-2"><BookOpen className="w-4 h-4" /> Planned</span>
                <span>{stats.planned}</span>
              </div>
              <div className="flex items-center justify-between text-gray-700 dark:text-gray-300">
                <span className="inline-flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Completed</span>
                <span>{stats.completed}</span>
              </div>
              <div className="flex items-center justify-between text-gray-700 dark:text-gray-300">
                <span className="inline-flex items-center gap-2"><Heart className="w-4 h-4" /> On Hold</span>
                <span>{stats.onHold}</span>
              </div>
              <div className="flex items-center justify-between text-gray-700 dark:text-gray-300">
                <span className="inline-flex items-center gap-2"><Star className="w-4 h-4" /> Dropped</span>
                <span>{stats.dropped}</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">By Media Type</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between text-gray-700 dark:text-gray-300">
                <span className="inline-flex items-center gap-2"><Film className="w-4 h-4" /> Movies</span>
                <span>{stats.typeCounts.MOVIE}</span>
              </div>
              <div className="flex items-center justify-between text-gray-700 dark:text-gray-300">
                <span className="inline-flex items-center gap-2"><Tv className="w-4 h-4" /> TV Series</span>
                <span>{stats.typeCounts.TV_SERIES}</span>
              </div>
              <div className="flex items-center justify-between text-gray-700 dark:text-gray-300">
                <span className="inline-flex items-center gap-2"><Star className="w-4 h-4" /> Anime</span>
                <span>{stats.typeCounts.ANIME}</span>
              </div>
              <div className="flex items-center justify-between text-gray-700 dark:text-gray-300">
                <span className="inline-flex items-center gap-2"><BookOpen className="w-4 h-4" /> Books</span>
                <span>{stats.typeCounts.BOOK}</span>
              </div>
              <div className="flex items-center justify-between text-gray-700 dark:text-gray-300">
                <span className="inline-flex items-center gap-2"><Gamepad2 className="w-4 h-4" /> Games</span>
                <span>{stats.typeCounts.GAME}</span>
              </div>
            </div>
          </div>
        </section>

        {isMe && (
          <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white inline-flex items-center gap-2">
                <Users className="w-5 h-5" />
                Friends
              </h2>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Find by username or email"
                  className="col-span-2 sm:col-span-1 min-w-0 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
                />
                <button
                  type="button"
                  onClick={handleSearchUsers}
                  className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 inline-flex items-center justify-center gap-1 whitespace-nowrap"
                >
                  <Search className="w-4 h-4" />
                  Search
                </button>
                <button
                  type="button"
                  disabled={savingFriendAction || !searchQuery.trim()}
                  onClick={() => handleSendRequest(searchQuery.trim())}
                  className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm inline-flex items-center justify-center gap-1 whitespace-nowrap disabled:opacity-60"
                >
                  <UserPlus className="w-4 h-4" />
                  Add
                </button>
              </div>

              {searchResults.length > 0 && (
                <div className="mt-4 space-y-2 max-h-72 overflow-y-auto pr-1">
                  {searchResults.map((result) => (
                    <div key={result.user.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex items-center gap-3">
                        <img
                          src={result.user.avatarUrl || croodlesUrl(result.user.username)}
                          alt={result.user.username}
                          className="w-9 h-9 rounded-md border border-gray-200 dark:border-gray-700"
                        />
                        <div className="min-w-0">
                          <Link to={`/u/${result.user.username}`} className="text-sm font-medium text-gray-900 dark:text-white hover:underline block truncate">
                            {result.user.username}
                          </Link>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{result.user.email}</p>
                        </div>
                      </div>

                      {result.relationship === 'NONE' && (
                        <button
                          type="button"
                          disabled={savingFriendAction}
                          onClick={() => handleSendRequest(result.user.username)}
                          className="px-2.5 py-1.5 text-xs rounded-md bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
                        >
                          Add Friend
                        </button>
                      )}
                      {result.relationship === 'SELF' && <span className="text-xs text-gray-500">You</span>}
                      {result.relationship === 'FRIEND' && <span className="text-xs text-green-600 dark:text-green-400">Friend</span>}
                      {result.relationship === 'PENDING_OUTGOING' && <span className="text-xs text-amber-600 dark:text-amber-400">Requested</span>}
                      {result.relationship === 'PENDING_INCOMING' && <span className="text-xs text-blue-600 dark:text-blue-400">Incoming request</span>}
                      {result.relationship === 'BLOCKED' && <span className="text-xs text-red-600 dark:text-red-400">Blocked</span>}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-5">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Friends List</h3>
                {friends.length === 0 ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">No friends yet.</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {friends.map((friend) => (
                      <div key={friend.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-2.5 flex items-center justify-between gap-2">
                        <Link to={`/u/${friend.username}`} className="min-w-0 flex items-center gap-2 hover:underline">
                          <img src={friend.avatarUrl || croodlesUrl(friend.username)} alt={friend.username} className="w-8 h-8 rounded-md" />
                          <span className="text-sm text-gray-900 dark:text-white truncate">{friend.username}</span>
                        </Link>
                        <button
                          type="button"
                          disabled={savingFriendAction}
                          onClick={() => handleRemoveFriend(friend.id)}
                          className="text-xs px-2 py-1 rounded border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Incoming Requests</h2>
                {incomingRequests.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No incoming requests.</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {incomingRequests.map((request) => (
                      <div key={request.requestId} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 flex items-center justify-between gap-2">
                        <Link to={`/u/${request.user.username}`} className="text-sm font-medium text-gray-900 dark:text-white hover:underline truncate">
                          {request.user.username}
                        </Link>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={savingFriendAction}
                            onClick={() => handleAcceptRequest(request.requestId)}
                            className="text-xs px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            disabled={savingFriendAction}
                            onClick={() => handleRejectOrCancel(request.requestId)}
                            className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Outgoing Requests</h2>
                {outgoingRequests.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No outgoing requests.</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {outgoingRequests.map((request) => (
                      <div key={request.requestId} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 flex items-center justify-between gap-2">
                        <Link to={`/u/${request.user.username}`} className="text-sm font-medium text-gray-900 dark:text-white hover:underline truncate">
                          {request.user.username}
                        </Link>
                        <button
                          type="button"
                          disabled={savingFriendAction}
                          onClick={() => handleRejectOrCancel(request.requestId)}
                          className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {!isMe && (
          <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Profile</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Friend requests can be sent from your own profile page using username or email search.
            </p>
          </section>
        )}

        {isMe && (
          <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recently Updated</h2>
            {stats.recent.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">No activity yet.</p>
            ) : (
              <div className="mt-4 space-y-2">
                {stats.recent.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.media.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {item.status.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {new Date(item.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default Profile;

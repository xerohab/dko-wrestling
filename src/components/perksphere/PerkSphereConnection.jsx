
import { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import {
  Loader2,
  Link2,
  Unlink,
  ExternalLink,
  ShieldCheck,
  Info,
  AlertCircle,
  CheckCircle,
  Copy,
  RefreshCw
} from "lucide-react";

export default function PerkSphereConnection() {
  const [user, setUser] = useState(null);
  const [link, setLink] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [challengeInput, setChallengeInput] = useState("");
  const [msg, setMsg] = useState(null);

  const confirmingRef = useRef(false);

  const loadLink = useCallback(async (u) => {
    if (!u?.id) return null;

    try {
      const res = await base44.entities.PerkSphereLink.filter(
        { user_id: u.id },
        { limit: 20, sort: "-created_date" }
      );

      const items = Array.isArray(res)
        ? res
        : (res?.items || []);

      const current =
        items.find((item) => item.status === "linked") ||
        items.find((item) => item.status === "pending") ||
        null;

      setLink(current);
      return current;
    } catch (error) {
      console.error("Unable to refresh Perk Sphere link status.");
      return null;
    }
  }, []);

  const confirmChallenge = useCallback(
    async (challenge, currentUser) => {
      const token = String(challenge || "").trim();

      if (!token) {
        setMsg({
          type: "error",
          text: "Please paste your Perk Sphere challenge token."
        });
        return;
      }

      if (!currentUser?.id) {
        setMsg({
          type: "error",
          text: "You must be signed in to DKO Wrestling."
        });
        return;
      }

      if (confirmingRef.current) return;

      confirmingRef.current = true;
      setBusy(true);
      setMsg(null);

      try {
        const response = await base44.functions.invoke(
          "partnerLinkConfirm",
          { challenge: token }
        );

        const data = response?.data || {};

        if (data.ok === true && data.linked === true) {
          setChallengeInput("");
          setShowConsent(false);

          const updatedLink = await loadLink(currentUser);

          if (updatedLink?.status === "linked") {
            setMsg({
              type: "success",
              text: "Your DKO Wrestling account is now connected to Perk Sphere."
            });
          } else {
            setMsg({
              type: "info",
              text: "Linux confirmed your connection, but DKO Wrestling has not yet refreshed its linked-account record. Please refresh the connection status."
            });
          }
        } else if (data.code === "setup_required") {
          setMsg({
            type: "info",
            text: "The DKO Wrestling Perk Sphere integration is still disabled in its backend configuration."
          });
        } else if (data.code === "credentials_missing") {
          setMsg({
            type: "error",
            text: "DKO Wrestling's Perk Sphere credentials are not configured."
          });
        } else if (data.code === "key_id_mismatch") {
          setMsg({
            type: "error",
            text: "DKO Wrestling's configured partner key does not match the expected key."
          });
        } else {
          setMsg({
            type: "error",
            text: data.message || "Perk Sphere could not verify this challenge. Please generate a fresh challenge and try again."
          });
        }
      } catch (error) {
        const data = error?.response?.data || {};

        setMsg({
          type: "error",
          text:
            data.message ||
            data.error ||
            "Linking confirmation failed. Please check the DKO Wrestling backend function and try again."
        });
      } finally {
        confirmingRef.current = false;
        setBusy(false);
      }
    },
    [loadLink]
  );

  useEffect(() => {
    let mounted = true;

    const initialise = async () => {
      try {
        const currentUser = await base44.auth.me();

        if (!mounted) return;

        if (!currentUser) {
          setMsg({
            type: "error",
            text: "Please sign in to DKO Wrestling to connect your account."
          });
          return;
        }

        setUser(currentUser);
        await loadLink(currentUser);

        if (!mounted) return;

        // Optional future redirect support.
        // Never store the challenge in browser history.
        const params = new URLSearchParams(window.location.search);
        const challenge = params.get("challenge");

        if (challenge) {
          params.delete("challenge");

          const remainingQuery = params.toString();
          const cleanUrl =
            window.location.pathname +
            (remainingQuery ? `?${remainingQuery}` : "") +
            window.location.hash;

          window.history.replaceState(
            window.history.state,
            "",
            cleanUrl
          );

          await confirmChallenge(challenge, currentUser);
        }
      } catch (error) {
        if (mounted) {
          setMsg({
            type: "error",
            text: "Could not load your DKO Wrestling account. Please sign in and try again."
          });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initialise();

    return () => {
      mounted = false;
    };
  }, [loadLink, confirmChallenge]);

  const handleConfirmChallenge = async () => {
    setShowConsent(false);
    await confirmChallenge(challengeInput, user);
  };

  const handleDisconnect = async () => {
    if (
      !window.confirm(
        "Disconnect your Perk Sphere account? You can reconnect anytime."
      )
    ) {
      return;
    }

    setBusy(true);
    setMsg(null);

    try {
      const response = await base44.functions.invoke(
        "partnerUnlink",
        {}
      );

      const data = response?.data || {};

      if (data.ok === true && data.serverConfirmed !== false) {
        await loadLink(user);

        setMsg({
          type: "success",
          text: data.message || "Your Perk Sphere account has been disconnected."
        });
      } else if (data.ok === true && data.serverConfirmed === false) {
        await loadLink(user);

        setMsg({
          type: "info",
          text:
            data.message ||
            "The disconnect request was recorded, but Linux has not confirmed it. Please check the connection status."
        });
      } else if (data.code === "setup_required") {
        setMsg({
          type: "info",
          text: "Perk Sphere unlinking is not enabled yet."
        });
      } else {
        setMsg({
          type: "error",
          text: data.message || "Could not disconnect your account."
        });
      }
    } catch (error) {
      setMsg({
        type: "error",
        text: "Disconnecting failed. Please try again."
      });
    } finally {
      setBusy(false);
    }
  };

  const handleRefresh = async () => {
    if (!user || busy) return;

    setBusy(true);

    try {
      await loadLink(user);
      setMsg(null);
    } finally {
      setBusy(false);
    }
  };

  const isLinked = link?.status === "linked";
  const isPending = link?.status === "pending";

  return (
    <div className="bg-card border border-border rounded-xl p-5 mb-4">
      <h3 className="font-oswald font-bold text-white text-base uppercase mb-1 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-accent" />
        Perk Sphere
      </h3>

      <p className="text-muted-foreground font-inter text-xs mb-4">
        Connect your DKO Wrestling account to Perk Sphere to earn
        rewards and loyalty XP from eligible activities.
      </p>

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
        </div>
      ) : isLinked ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-inter px-2 py-1 rounded bg-green-500/10 text-green-400">
              <CheckCircle className="w-3.5 h-3.5" />
              Connected
            </span>

            <a
              href="https://perksphere.org"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-accent font-inter text-xs hover:underline"
            >
              Perk Sphere
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <p className="text-muted-foreground font-inter text-xs">
            Your DKO Wrestling account is linked to Perk Sphere.
            Eligible activities can be submitted for rewards.
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleDisconnect}
              disabled={busy}
              className="flex items-center gap-1.5 px-4 py-2 bg-secondary border border-red-500/40 text-red-400 font-oswald text-xs font-semibold tracking-wider uppercase rounded hover:border-red-500 transition-colors disabled:opacity-40"
            >
              {busy ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Unlink className="w-3.5 h-3.5" />
              )}
              Disconnect
            </button>

            <button
              onClick={handleRefresh}
              disabled={busy}
              className="flex items-center gap-1.5 px-3 py-2 bg-secondary border border-border text-foreground text-xs rounded hover:border-accent transition-colors disabled:opacity-40"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {isPending && (
            <span className="inline-flex items-center gap-1.5 text-xs font-inter px-2 py-1 rounded bg-yellow-500/10 text-yellow-400">
              <AlertCircle className="w-3.5 h-3.5" />
              Linking in progress
            </span>
          )}

          <div className="bg-secondary border border-border rounded-lg p-4 space-y-3">
            <h4 className="font-oswald font-bold text-white text-sm uppercase">
              Connect your Perk Sphere account
            </h4>

            <p className="text-muted-foreground font-inter text-xs">
              First, sign in to Perk Sphere and generate your
              single-use account-linking challenge.
            </p>

            <a
              href="https://perksphere.org"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-card border border-border text-white font-oswald text-xs font-semibold uppercase rounded hover:border-accent transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Open Perk Sphere
            </a>

            <div className="space-y-2">
              <label
                htmlFor="perk-sphere-challenge"
                className="block text-xs font-inter font-medium text-foreground"
              >
                Perk Sphere challenge token
              </label>

              <input
                id="perk-sphere-challenge"
                type="text"
                value={challengeInput}
                onChange={(event) =>
                  setChallengeInput(event.target.value)
                }
                placeholder="Paste your challenge token here"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                disabled={busy}
                className="w-full px-3 py-2.5 bg-card border border-border rounded text-white font-mono text-xs focus:outline-none focus:border-accent disabled:opacity-50"
              />

              <p className="text-muted-foreground font-inter text-xs">
                Challenges expire after 10 minutes and can only be
                used once.
              </p>
            </div>

            <button
              onClick={() => setShowConsent(true)}
              disabled={busy || !challengeInput.trim() || !user}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent text-black font-oswald font-semibold text-sm tracking-wider uppercase rounded hover:brightness-110 transition-colors disabled:opacity-40"
            >
              {busy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Link2 className="w-4 h-4" />
              )}
              Verify &amp; Connect
            </button>
          </div>

          <div className="flex items-start gap-2 p-3 bg-secondary rounded-lg">
            <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-muted-foreground font-inter text-xs">
              Connecting allows Perk Sphere to track eligible
              DKO Wrestling activities for rewards. You can
              disconnect anytime. Your DKO Wrestling password
              is never shared with Perk Sphere.
            </p>
          </div>

          <button
            onClick={handleRefresh}
            disabled={busy}
            className="inline-flex items-center gap-1.5 text-muted-foreground font-inter text-xs hover:text-white disabled:opacity-40"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh connection status
          </button>
        </div>
      )}

      {msg && (
        <div
          role="status"
          className={`mt-3 flex items-start gap-2 p-3 rounded-lg text-xs font-inter ${
            msg.type === "error"
              ? "bg-red-500/10 text-red-400"
              : msg.type === "success"
              ? "bg-green-500/10 text-green-400"
              : "bg-accent/10 text-accent"
          }`}
        >
          {msg.type === "success" ? (
            <CheckCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          ) : msg.type === "error" ? (
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          ) : (
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          )}
          {msg.text}
        </div>
      )}

      {showConsent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md p-6">
            <h4 className="font-oswald font-bold text-white text-lg uppercase mb-2">
              Connect to Perk Sphere
            </h4>

            <p className="text-muted-foreground font-inter text-sm mb-4">
              You're about to link your DKO Wrestling account
              {user?.email && (
                <>
                  {" "}(<span className="text-white">{user.email}</span>)
                </>
              )}
              {" "}to Perk Sphere.
            </p>

            <p className="text-muted-foreground font-inter text-xs mb-4">
              Perk Sphere will be able to associate eligible
              DKO Wrestling activities with your Perk Sphere
              account for rewards and loyalty XP.
              Your password will not be shared.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConsent(false)}
                disabled={busy}
                className="flex-1 px-4 py-2.5 bg-secondary border border-border text-foreground font-inter text-sm rounded hover:border-primary transition-colors disabled:opacity-40"
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmChallenge}
                disabled={busy}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-accent text-black font-oswald font-semibold text-sm uppercase rounded hover:brightness-110 transition-colors disabled:opacity-40"
              >
                {busy && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                I Agree, Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

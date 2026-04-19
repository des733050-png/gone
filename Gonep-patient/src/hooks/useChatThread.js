import { useEffect, useState } from 'react';
import { getChatThread } from '../api';

export function useChatThread(enabled = true) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled) {
      setMessages([]);
      setLoading(false);
      setError(null);
      return undefined;
    }
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getChatThread();
        if (mounted) setMessages(data || []);
      } catch (err) {
        if (mounted) setError(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [enabled]);

  return { messages, loading, error };
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export async function sendCoachMessage(payload) {
  const response = await fetch(`${API_BASE_URL}/api/coach/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Không gửi được câu hỏi đến AI Coach');
  }

  return data;
}

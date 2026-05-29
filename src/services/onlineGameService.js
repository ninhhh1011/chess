import supabase from '../lib/supabaseClient';

export async function createGame(userId) {
  if (!userId) throw new Error('User must be logged in to create a game');
  
  const { data, error } = await supabase
    .from('online_games')
    .insert([{ white_user_id: userId, status: 'waiting' }])
    .select()
    .single();

  if (error) throw error;
  
  const inviteUrl = `${window.location.origin}/play/online/${data.id}`;
  return { gameId: data.id, inviteUrl };
}

export async function joinGame(gameId, userId) {
  if (!userId) throw new Error('User must be logged in to join a game');

  const { data: game, error: fetchError } = await supabase
    .from('online_games')
    .select('*')
    .eq('id', gameId)
    .single();

  if (fetchError) throw fetchError;

  // Already a participant?
  if (game.white_user_id === userId) return { playerColor: 'w' };
  if (game.black_user_id === userId) return { playerColor: 'b' };

  // Can we join?
  if (game.status === 'waiting' && !game.black_user_id) {
    const { error: updateError } = await supabase
      .from('online_games')
      .update({ black_user_id: userId, status: 'playing', updated_at: new Date().toISOString() })
      .eq('id', gameId);

    if (updateError) throw updateError;
    return { playerColor: 'b' };
  }

  throw new Error('Game is full or already playing');
}

export function subscribeToGame(gameId, onMove, onStateChange) {
  const channel = supabase.channel(`game:${gameId}`);

  channel
    .on('broadcast', { event: 'move' }, (payload) => {
      if (onMove) onMove(payload.payload);
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'online_games', filter: `id=eq.${gameId}` }, (payload) => {
      if (onStateChange) onStateChange(payload.new);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function pushMove(gameId, move, newFen, pgn) {
  // Broadcast move instantly
  await supabase.channel(`game:${gameId}`).send({
    type: 'broadcast',
    event: 'move',
    payload: { move, newFen, pgn },
  });

  // Persist state
  await supabase
    .from('online_games')
    .update({ fen: newFen, pgn: pgn, updated_at: new Date().toISOString() })
    .eq('id', gameId);
}

export async function updateGameStatus(gameId, status) {
  await supabase
    .from('online_games')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', gameId);
}

export async function fetchGameState(gameId) {
  const { data, error } = await supabase
    .from('online_games')
    .select('*')
    .eq('id', gameId)
    .single();
    
  if (error) throw error;
  return data;
}

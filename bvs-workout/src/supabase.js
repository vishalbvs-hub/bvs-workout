import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://gnynllsecmojzdibyndt.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_-YkMnmpm74UExW3WMrmGRA_JH5BOwhx'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export async function checkUser(username, pin) {
  const { data } = await supabase
    .from('user_data')
    .select('pin')
    .eq('username', username.toLowerCase().trim())
    .limit(1)

  if (data && data.length > 0) {
    return data[0].pin === pin ? 'ok' : 'wrong_pin'
  }
  return 'new_user'
}

export async function loadData(username, key, fallback) {
  try {
    const { data, error } = await supabase
      .from('user_data')
      .select('data_value')
      .eq('username', username.toLowerCase().trim())
      .eq('data_key', key)
      .single()

    if (error || !data) return fallback
    return data.data_value || fallback
  } catch {
    return fallback
  }
}

export async function saveData(username, pin, key, value) {
  try {
    await supabase
      .from('user_data')
      .upsert({
        username: username.toLowerCase().trim(),
        pin,
        data_key: key,
        data_value: value,
        updated_at: new Date().toISOString()
      }, { onConflict: 'username,data_key' })
  } catch (e) {
    console.error('Save error:', e)
  }
}

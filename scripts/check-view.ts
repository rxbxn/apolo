
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load env vars from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env vars')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
    console.log('--- Checking v_coordinadores_completo columns ---')
    const { data, error } = await supabase
        .from('v_coordinadores_completo')
        .select('*')
        .limit(1)

    if (error) {
        console.error('Error fetching view:', error)
    } else if (data && data.length > 0) {
        console.log('Columns:', Object.keys(data[0]))
    } else {
        console.log('No data found in view')
    }
}

main()

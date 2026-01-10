'use client'

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'

type TipoMilitante = Database['public']['Tables']['tipos_militante']['Row']
type TipoMilitanteInsert = Database['public']['Tables']['tipos_militante']['Insert']

export function useTiposMilitante() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const crear = useCallback(async (tipoMilitante: TipoMilitanteInsert) => {
        try {
            setLoading(true)
            setError(null)

            const { data, error: insertError } = await supabase
                .from('tipos_militante')
                .insert(tipoMilitante)
                .select()
                .single()

            if (insertError) throw insertError

            return data
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Error desconocido')
            setError(error)
            throw error
        } finally {
            setLoading(false)
        }
    }, [])
    
    const listar = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const { data, error: queryError } = await supabase
                .from('tipos_militante')
                .select('*')
                .order('codigo', { ascending: true });

            if (queryError) throw queryError;

            return data || [];
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Error desconocido');
            setError(error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);


    return {
        crear,
        listar,
        loading,
        error,
    }
}

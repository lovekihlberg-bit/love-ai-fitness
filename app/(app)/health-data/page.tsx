'use client'

import { useState } from 'react'
import { Layout } from '@/components/layout/Layout'
import { HealthDataImporter } from '@/components/health/HealthImporter'
import { Card, CardTitle, CardContent } from '@/components/ui/common'
import { useUser } from '@/lib/contexts/UserContext'
import supabase from '@/lib/hooks/useSupabase'
import { useEffect } from 'react'
import { Download, Trash2 } from 'lucide-react'

export default function HealthDataPage() {
  const { user } = useUser()
  const [imports, setImports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return

    const fetchImports = async () => {
      const { data, error } = await supabase
        .from('validation_reports')
        .select('*')
        .eq('profile_id', user.id)
        .eq('table_name', 'health_metrics')
        .order('created_at', { ascending: false })
        .limit(10)

      if (!error && data) {
        setImports(data)
      }
      setLoading(false)
    }

    fetchImports()
  }, [user?.id])

  return (
    <Layout>
      <div className="space-y-6 p-4 sm:p-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Hälsodata</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Importera och hantera din hälsoinformation från Apple Health eller andra källor
          </p>
        </div>

        {/* Import Section */}
        <HealthDataImporter />

        {/* Import History */}
        <Card>
          <CardTitle>Tidigare importeringar</CardTitle>
          <CardContent>
            {loading ? (
              <p className="text-gray-500">Läser in...</p>
            ) : imports.length > 0 ? (
              <div className="space-y-2">
                {imports.map((imp) => (
                  <div
                    key={imp.id}
                    className="flex items-center justify-between rounded border border-gray-200 p-3 dark:border-gray-700"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {imp.table_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(imp.created_at).toLocaleDateString('sv-SE')}{' '}
                        {new Date(imp.created_at).toLocaleTimeString('sv-SE')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {imp.validation_status === 'PASS' ? (
                        <span className="rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-800 dark:bg-green-900 dark:text-green-200">
                          Lyckades
                        </span>
                      ) : (
                        <span className="rounded bg-red-100 px-2 py-1 text-xs font-semibold text-red-800 dark:bg-red-900 dark:text-red-200">
                          Misslyckades
                        </span>
                      )}
                      <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
                        <Download size={16} className="text-gray-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Inga tidigare importeringar</p>
            )}
          </CardContent>
        </Card>

        {/* FAQ Section */}
        <Card>
          <CardTitle>Vanliga frågor</CardTitle>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                Vilka datatyper kan importeras?
              </h4>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Du kan importera träningspass, steg, sömn, hjärtfrekvens, HRV, VO2 Max, kroppsvikt,
                och andra hälsomätningar från Health Auto Export JSON-filer.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                Hur exporterar jag data från Apple Health?
              </h4>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Använd Health Auto Export-appen för att exportera din hälsodata till JSON-format.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                Är min data säker?
              </h4>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Ja. All data är krypterad och lagrad säkert i Supabase. Du äger dina data och kan
                radera det när som helst.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}

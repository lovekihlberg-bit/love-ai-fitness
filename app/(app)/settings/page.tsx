'use client'

import { useState } from 'react'
import { useTheme } from 'next-themes'
import { Layout } from '@/components/layout/Layout'
import { Card, CardTitle, CardContent, Input, Button } from '@/components/ui/common'
import { LogOut, Download, Trash2, Moon, Sun } from 'lucide-react'

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  return (
    <Layout>
      <div className="space-y-6 p-4 sm:p-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Inställningar</h1>
          <p className="text-gray-600 dark:text-gray-400">Hantera din profil och preferenser</p>
        </div>

        {/* Profile Section */}
        <Card>
          <CardTitle>Profil</CardTitle>
          <CardContent className="space-y-4">
            <Input label="Fullständigt namn" placeholder="Love Kihlberg" />
            <Input label="Föredraget namn" placeholder="Love" />
            <Input label="Längd (cm)" type="number" placeholder="180" />
            <Input label="Email" type="email" placeholder="love@example.com" disabled />
            <Button>Spara ändringar</Button>
          </CardContent>
        </Card>

        {/* Theme Section */}
        <Card>
          <CardTitle>Tema</CardTitle>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Välj tema för appen</p>
            <div className="flex gap-4">
              <button
                onClick={() => setTheme('light')}
                className={`flex items-center gap-2 rounded px-4 py-2 transition-colors ${
                  theme === 'light'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                <Sun size={20} />
                Ljust
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`flex items-center gap-2 rounded px-4 py-2 transition-colors ${
                  theme === 'dark'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                <Moon size={20} />
                Mörkt
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardTitle>Notifieringar</CardTitle>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-3">
              <input type="checkbox" defaultChecked className="h-4 w-4" />
              <span className="text-sm">Påminn om träning</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" defaultChecked className="h-4 w-4" />
              <span className="text-sm">Hälsodata uppdateringar</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="h-4 w-4" />
              <span className="text-sm">Veckovisa rapporter</span>
            </label>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardTitle>Datahantering</CardTitle>
          <CardContent className="space-y-3">
            <Button className="w-full" variant="outline">
              <Download size={18} className="mr-2" />
              Exportera data
            </Button>
            <Button className="w-full" variant="outline">
              <LogOut size={18} className="mr-2" />
              Logga ut
            </Button>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200 dark:border-red-900">
          <CardTitle className="text-red-600">Farlig zon</CardTitle>
          <CardContent>
            {!showDeleteConfirm ? (
              <Button className="w-full" variant="outline" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 size={18} className="mr-2" />
                Radera konto
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-red-600">
                  Är du säker? Denna åtgärd kan inte ångras.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                    Avbryt
                  </Button>
                  <Button variant="primary" className="bg-red-600 hover:bg-red-700">
                    Ja, radera
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}

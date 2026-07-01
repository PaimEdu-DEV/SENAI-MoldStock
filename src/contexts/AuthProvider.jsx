import { onAuthStateChanged, signOut } from 'firebase/auth'
import { useEffect, useMemo, useState } from 'react'
import { auth, isFirebaseConfigured } from '../services/firebase.js'
import { getAdminProfile } from '../services/userService.js'
import { AuthContext } from './authContext.js'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setLoading(false)
      return undefined
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true)
      setUser(currentUser)

      if (currentUser) {
        try {
          const adminProfile = await getAdminProfile(currentUser.uid)
          setProfile(adminProfile)
        } catch (error) {
          console.error(error)
          setProfile(null)
        }
      } else {
        setProfile(null)
      }

      setLoading(false)
    })

    return unsubscribe
  }, [])

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      isFirebaseConfigured,
      isAdmin: Boolean(profile),
      isSuperAdmin: profile?.role === 'superadmin',
      logout: () => (auth ? signOut(auth) : Promise.resolve()),
    }),
    [user, profile, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

import { legacy_createStore as createStore } from 'redux'

// Get the initial language from localStorage or use 'English' as default
const initialLanguage = localStorage.getItem('language') || 'English'

// Initial state
const initialState = {
  sidebarShow: true,
  theme: 'light',
  language: initialLanguage, // Default language
}

// Reducer
const changeState = (state = initialState, { type, ...rest }) => {
  switch (type) {
    case 'set':
      return { ...state, ...rest }
    default:
      return state
  }
}

// Create the Redux store
const store = createStore(changeState)

// Subscribe to the store to save language to localStorage
store.subscribe(() => {
  const { language } = store.getState()
  if (language) {
    localStorage.setItem('language', language)
  }
})

export default store

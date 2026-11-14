<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/22e68371-7102-4a40-8bba-c9a812abeaa7

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Project structure

```
src/
  App.tsx                 app shell: state + handlers
  main.tsx
  types.ts
  components/
    auth/                 LoginPage, JoinCodeModal
    calendar/             CalendarView, EventDetailModal, NewEventModal, NewTaskModal, MeetingVerificationModal
    groups/               FriendGroupsView
    matcher/              FreeDateMatcherView
    layout/               Header, UserProfileMenu, NotificationDrawer, UpcomingBanner, Toast
  hooks/                  useViewNavigation (views + swipe), usePersistedCollection
  lib/                    firebase (auth + Firestore), useCloudSync, storage (localStorage helpers)
  utils/                  calendarUtils, scheduleMatcher
  data/                   initialData
```

## Firebase setup

1. Authentication > Sign-in method: enable **Email/Password** and **Google**.
2. Authentication > Settings > Authorized domains: add the domain you serve the app from.
3. Deploy the security rules: `firebase deploy --only firestore:rules` (or paste `firestore.rules` into the console).

Circles are shared through `groups` (`memberIds`) and invite codes live in `invites/{code}`.
To join, a friend signs in, enters the code, and is added to the circle in Firestore.

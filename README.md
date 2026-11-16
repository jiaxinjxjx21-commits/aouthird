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
3. Deploy the security rules to the **named** database (`firebase.json` already points at it):
   `npx firebase-tools login && npx firebase-tools deploy --only firestore:rules`
   (or paste `firestore.rules` into Firestore > Rules for database `ai-studio-naddd-...` in the console).
   Without this step friends get "permission denied" when they enter a room code.

Circles are shared through `groups` (`memberIds`) and invite codes live in `invites/{code}`.
To join, a friend signs in, enters the code, and is added to the circle in Firestore.


Invite flow: the host opens **Invite Friends** (this publishes the circle + its code to Firestore and shows a green "Live" check), then shares the code or the `?join=CODE` link. A friend signs in, opens the link (or taps **Enter Code**), and is added to the circle.

Notifications: when someone creates a gathering, broadcasts an update, locks a time, checks in, or joins a circle, a notification document is written for every other member of the circle (`notifications/{id}`, `ownerId` = the recipient). Friends who have the app open get a pop-up instantly; others see it in the bell list next time. This needs the latest `firestore.rules` (the notifications block) to be published. It does not send phone push notifications while the app is closed (that needs Firebase Cloud Messaging + Cloud Functions, i.e. the Blaze plan).

Shared gatherings: an event that belongs to a circle (it has a `groupId`) is stored in `events/{id}` and every member of that circle can read it and update it (RSVP, check-in, votes). Only the host (`ownerId`) can delete it. Personal events have no `groupId` and stay private. Each device listens to `events where groupId == <circle>` for every circle the user is in. This needs the latest `firestore.rules` (the events block) to be published.

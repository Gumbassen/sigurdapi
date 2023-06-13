# WebSocket Beskedtyper:

## Ping
Klienten modtager denne "ping" besked fra serveren med regelmæssigt mellemrum (ca. hvert 30 sekund).
```json
{
    "type":      "ping",
    "challenge": "[[NONCE]]" // Nonce er en tilfældig hex-streng
}
```

Her skal klienten svarer med en "pong"-besked med samme challenge-værdi inden for 10 sekunder.  
Svarer klienten ikke inden for tidsrummet kickes den.
```json
{
    "type":   "pong",
    "answer": "[[NONCE]]"
}
```

## Authorize:
Hvis din klient ikke kan sende en "authorization"-header når forbindelsen oprettes, så skal klienten sende denne besked ASAP.  
Klienten har 10 sekunder til at sende beskeden.  
Serveren kicker din klient, hvis din token er ugyldig.
```json
{
    "type":  "authorize",
    "token": "[[DIN JWT TOKEN]]" // Altså bare den rå token, uden "bearer ".
}
```

## Action:

```json
{
    "type":      "action",
    "companyId": "[[FIRMA ID]]",
    "action":    "[[ created / deleted / updated ]]",   // Hvilken handling der triggerede beskeden
    "name":      "[[MODEL NAVN]]",                      // Navnet på den data-model der er blevet ændret.
    "url":       "[[URL]]",                             // URLen på den request der triggerede beskeden
    "data":      { "foo": "bar" }                       // Dataet fra den model der blev ændret.
}
```

Liste af navne på datamodeller:
 - TimeEntry
 - TimeEntryTypeCollection
 - TimeEntryType
 - User
 - TimeTag
 - UserRole
 - Location
 - TimeTagRule
 - TimeEntryMessage
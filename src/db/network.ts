import net from "node:net";

/**
 * Node essaie chaque adresse IP (IPv6 puis IPv4) avec un délai de 250 ms seulement.
 * Depuis Madagascar vers un serveur Neon/Supabase aux États-Unis, la poignée de main
 * dépasse ce délai et toutes les tentatives échouent (ETIMEDOUT). On l'allonge.
 */
net.setDefaultAutoSelectFamilyAttemptTimeout(5000);

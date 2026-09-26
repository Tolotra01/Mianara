import dns from "node:dns";
import net from "node:net";

/**
 * Connexion à Neon/Supabase (États-Unis) depuis Madagascar :
 *  - l'IPv6 n'est souvent pas routé par les fournisseurs locaux (« réseau inaccessible ») :
 *    on passe l'IPv4 en premier et on ne tente plus les deux familles en parallèle ;
 *  - la poignée de main dépasse le délai par défaut de 250 ms : on l'allonge.
 */
dns.setDefaultResultOrder("ipv4first");
net.setDefaultAutoSelectFamily(false);
net.setDefaultAutoSelectFamilyAttemptTimeout(5000);

[0:00] Bonjour, je vous présente Bovibot, une application web complète de gestion en délevage bovin. 
[0:06] Donc, le tableau de bord affiche en temps réel les indicateurs clés. 
[0:13] Donc, 30 animaux actifs, 22 femelles en gestation, 7 alertes critiques et un chiffre d'affaires de 9 110 000.
[0:24] Nous avons aussi l'évolution déposée au cours des 30 derniers jours. 
[0:28] On peut aussi regarder celui des 7 derniers jours, la répartition active gestation et critique, les actes de santé et les récentes alertes. 
[0:41] Donc, par exemple, pour TAC 29 et 28, ils ont un rappel de vaccination en retard.
[0:52] L'interface de l'assistant IA permet d'interroger toute la base donnée en langage naturel. 
[0:59] Le LLM, ici DeepSea Chat, traduit la question en SQL, exécute la requête et affiche les résultats. 
[1:05] Par exemple, à droite nous avons le Data Playground qui affiche en temps réel le SQL généré par le LLM.
[1:42] En plus des consultations, l'assistant peut déclencher des actions sur la base. 
[1:48] Mais avant tout appel de procédure stockée, le système exige une confirmation explicite. 
[1:53] C'est une règle de sécurité fondamentale du projet.
[1:57] Par exemple, la procédure stockée a été appelée et elle enregistre la pesée, 
[2:35] mais un jour le poids actuel de l'animal calcule le GMQ et déclenche une alerte si le gain est insuffisant. 
[2:43] Même principe pour déclencher une vente. 
[2:46] On fait appel à la procédure qui vérifie d'abord que l'animal est bon et bien actif avant de valider la transaction.
[3:28] En cas d'erreur, nous avons un signalement qui détermine si l'animal peut être vendu ou non en fonction de son statut. [3:37] Réessayons. 
[3:51] Au niveau de troupeau, nous voyons bien que Tax7 a changé de statut.
[4:02] Il n'est même plus disponible. 
[4:04] Le troupeau ici liste tous les animaux actifs avec leur indicateur de performance. 
[4:10] La colonne GMQ est colorée selon le seuil.
[4:17] Par exemple, ici en vert, lorsque c'est au-dessus de 0,35. 
[4:24] On peut exporter en CSV. 
[4:27] On peut ajouter un nouvel animal.
[4:30] On peut faire une analyse IA et une saisie lait. 
[4:38] On peut aussi filtrer seulement les mâles ou les femelles en fonction de leur race ou saisir le numéro de taille. 
[4:52] Ensuite nous avons la généalogie.
[4:54] La page généalogie permet de visualiser l'arbre généalogique du troupeau grâce aux clés étrangères référencées comme MERID et PERID de la table animaux. 
[5:12] On peut simuler un croisement. 
[5:27] On peut sélectionner un producteur aussi.
[5:33] Au niveau de gestation, on liste toutes les femelles en gestation. 
[5:43] On peut faire une analyse grâce à l'IA. 
[5:49] Au niveau de santé, nous avons les alertes critiques ainsi que le registre des actes.
[5:55] On peut voir ceux qui ont été vaccinés, les animaux en soins. 
[6:05] On peut marquer une alerte comme traité et avoir un aperçu vétérinaire. 
[6:17] Nous avons un peu plus en bas le vaccin, les rendez-vous à venir et le budget santé mensuel de 16 000.
[6:25] Au niveau du stock, nous avons les inventaires des stocks. 
[6:29] On peut faire une analyse IA. 
[6:35] Nous avons les aliments concentrés ainsi que leurs seuils critiques.
[6:44] Le foin de luzerne et bien d'autres. 
[6:51] Ensuite, nous avons la partie rapport. 
[6:54] La page rapport centralise les analyses de performance.
[6:57] Évolution des ventes sur 12 mois, GMQ moyen par race, dépense santé mensuelle et top performance individuelle. [7:09] Nous avons la répartition par sexe aussi. 
[7:22] Enfin, nous avons les paramètres du système.
[7:26] Nous avons le nom de la ferme, le superviseur principal, les infos qu'on peut modifier. [7:33] Nous avons la confirmation IA, le modèle et l'état de la clé. 
[7:39] On peut aussi modifier le seuil d'alerte et réinitialiser les données de test.
[7:48] Merci de votre attention.
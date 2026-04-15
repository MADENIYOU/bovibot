[0:00] Bonjour, je vous présente Bovibot, une application web complète de gestion en élevage bovin.
[0:06] Donc, le tableau de bord affiche en temps réel les indicateurs clés.
[0:13] Donc, 30 animaux actifs, 22 femelles en gestation, 7 alertes critiques et un chiffre d'affaires de 9 110 000.
--> Affichage des KPIs principaux sur le tableau de bord en temps réel.
[0:24] Nous avons aussi l'évolution déposée au cours des 30 derniers jours.
--> Affichage du graphique d'évolution sur les 30 derniers jours.
[0:28] On peut aussi regarder celui des 7 derniers jours, la répartition active gestation et critique, les actes de santé et les récentes alertes.
--> Changement de période à 7 derniers jours ; affichage de la répartition par statut et des actes de santé récents.
[0:41] Donc, par exemple, pour TAC 29 et 28, ils ont un rappel de vaccination en retard.
--> Consultation des alertes critiques : rappel de vaccination en retard détecté pour TAC29 et TAC28.
[0:52] L'interface de l'assistant IA permet d'interroger toute la base de données en langage naturel.
--> Navigation vers l'interface de l'assistant IA.
[0:59] Le LLM, ici DeepSeek Chat, traduit la question en SQL, exécute la requête et affiche les résultats.
--> Saisie d'une question en langage naturel ; génération et exécution automatique de la requête SQL correspondante.
[1:05] Par exemple, à droite nous avons le Data Playground qui affiche en temps réel le SQL généré par le LLM.
--> Visualisation du SQL généré dans le panneau Data Playground en temps réel.
[1:42] En plus des consultations, l'assistant peut déclencher des actions sur la base.
--> Démonstration de la capacité d'action de l'assistant au-delà de la simple consultation.
[1:48] Mais avant tout appel de procédure stockée, le système exige une confirmation explicite.
--> Déclenchement d'une procédure stockée ; affichage de la boîte de dialogue de confirmation de sécurité.
[1:53] C'est une règle de sécurité fondamentale du projet.
--> Validation de la confirmation par l'utilisateur pour autoriser l'exécution.
[1:57] Par exemple, la procédure stockée a été appelée et elle enregistre la pesée,
--> Appel de la procédure stockée d'enregistrement de pesée ; données de poids saisies et enregistrées en base.
[2:35] mais un jour le poids actuel de l'animal calcule le GMQ et déclenche une alerte si le gain est insuffisant.
--> Calcul automatique du GMQ à partir du nouveau poids ; déclenchement d'une alerte si le seuil est insuffisant.
[2:43] Même principe pour déclencher une vente.
--> Navigation vers la fonctionnalité de vente via l'assistant IA.
[2:46] On fait appel à la procédure qui vérifie d'abord que l'animal est bien actif avant de valider la transaction.
--> Appel de la procédure stockée de vente ; vérification du statut actif de l'animal avant confirmation de la transaction.
[3:28] En cas d'erreur, nous avons un signalement qui détermine si l'animal peut être vendu ou non en fonction de son statut.
--> Tentative de vente sur un animal au statut incompatible ; affichage du message d'erreur et blocage de la transaction.
[3:37] Réessayons.
--> Nouvelle tentative avec un animal au statut valide.
[3:51] Au niveau du troupeau, nous voyons bien que TAX7 a changé de statut.
--> Navigation vers la page Troupeau ; vérification du changement de statut de TAX7 après la vente.
[4:02] Il n'est même plus disponible.
--> Confirmation visuelle que TAX7 n'apparaît plus parmi les animaux actifs disponibles.
[4:04] Le troupeau ici liste tous les animaux actifs avec leur indicateur de performance.
--> Affichage de la liste complète des animaux actifs avec leurs indicateurs de performance.
[4:10] La colonne GMQ est colorée selon le seuil.
--> Visualisation du code couleur de la colonne GMQ selon les seuils définis.
[4:17] Par exemple, ici en vert, lorsque c'est au-dessus de 0,35.
--> Identification d'un animal avec un GMQ supérieur à 0,35 affiché en vert.
[4:24] On peut exporter en CSV.
--> Clic sur le bouton d'export ; téléchargement du fichier CSV de la liste du troupeau.
[4:27] On peut ajouter un nouvel animal.
--> Ouverture du formulaire d'ajout d'un nouvel animal.
[4:30] On peut faire une analyse IA et une saisie lait.
--> Déclenchement de l'analyse IA du troupeau ; accès au formulaire de saisie de production laitière.
[4:38] On peut aussi filtrer seulement les mâles ou les femelles en fonction de leur race ou saisir le numéro de taille.
--> Application des filtres par sexe, race et numéro d'identification sur la liste du troupeau.
[4:52] Ensuite nous avons la généalogie.
--> Navigation vers la page Généalogie.
[4:54] La page généalogie permet de visualiser l'arbre généalogique du troupeau grâce aux clés étrangères référencées comme MERID et PERID de la table animaux.
--> Affichage de l'arbre généalogique construit à partir des relations MERID et PERID de la base de données.
[5:12] On peut simuler un croisement.
--> Sélection de deux animaux et lancement de la simulation de croisement ; affichage des résultats estimés.
[5:27] On peut sélectionner un producteur aussi.
--> Sélection d'un producteur dans le filtre ; mise à jour de l'arbre généalogique affiché.
[5:33] Au niveau de gestation, on liste toutes les femelles en gestation.
--> Navigation vers la page Gestation ; affichage de la liste des femelles gestantes avec leurs indicateurs.
[5:43] On peut faire une analyse grâce à l'IA.
--> Déclenchement de l'analyse IA sur les données de gestation ; affichage des recommandations.
[5:49] Au niveau de santé, nous avons les alertes critiques ainsi que le registre des actes.
--> Navigation vers la page Santé ; affichage des alertes critiques et du registre des actes vétérinaires.
[5:55] On peut voir ceux qui ont été vaccinés, les animaux en soins.
--> Filtrage des animaux vaccinés et des animaux actuellement en soins.
[6:05] On peut marquer une alerte comme traitée et avoir un aperçu vétérinaire.
--> Marquage d'une alerte comme traitée ; consultation de l'aperçu vétérinaire associé à l'animal.
[6:17] Nous avons un peu plus en bas le vaccin, les rendez-vous à venir et le budget santé mensuel de 16 000.
--> Défilement vers le bas ; affichage du calendrier vaccinal, des prochains rendez-vous et du budget santé mensuel.
[6:25] Au niveau du stock, nous avons les inventaires des stocks.
--> Navigation vers la page Stock ; affichage de l'inventaire complet.
[6:29] On peut faire une analyse IA.
--> Déclenchement de l'analyse IA sur les données de stock ; affichage des recommandations de réapprovisionnement.
[6:35] Nous avons les aliments concentrés ainsi que leurs seuils critiques.
--> Visualisation des niveaux de stock des aliments concentrés avec indication des seuils critiques.
[6:44] Le foin de luzerne et bien d'autres.
--> Défilement dans la liste des stocks ; affichage du foin de luzerne et des autres ressources disponibles.
[6:51] Ensuite, nous avons la partie rapport.
--> Navigation vers la page Rapport.
[6:54] La page rapport centralise les analyses de performance.
--> Affichage du tableau de bord des rapports de performance globale.
[6:57] Évolution des ventes sur 12 mois, GMQ moyen par race, dépense santé mensuelle et top performance individuelle.
--> Visualisation des graphiques : courbe des ventes sur 12 mois, histogramme GMQ par race, dépenses santé et classement individuel.
[7:09] Nous avons la répartition par sexe aussi.
--> Affichage du graphique de répartition par sexe dans les rapports.
[7:22] Enfin, nous avons les paramètres du système.
--> Navigation vers la page Paramètres.
[7:26] Nous avons le nom de la ferme, le superviseur principal, les infos qu'on peut modifier.
--> Affichage et édition des informations générales de la ferme et du superviseur principal.
[7:33] Nous avons la confirmation IA, le modèle et l'état de la clé.
--> Vérification de la configuration IA : confirmation activée, modèle sélectionné et état de la clé API.
[7:39] On peut aussi modifier le seuil d'alerte et réinitialiser les données de test.
--> Modification du seuil d'alerte GMQ ; utilisation du bouton de réinitialisation des données de test.
[7:48] Merci de votre attention.
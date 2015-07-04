# BGate RTB System 

* Version: 0.0.1
* Nodejs & NPM
* Author: Van-Duyet Le (lvduit)
* Copyright (c) 2015

# Real-time Bidding 

*Real-time bidding (RTB)* is a means by which advertising inventory is bought and sold on a per-impression basis, via programmatic instantaneous auction, similar to financial markets. With real-time bidding, advertising buyers bid on an impression and, if the bid is won, the buyer’s ad is instantly displayed on the publisher’s site. Real-time bidding lets advertisers manage and optimize ads from multiple ad-networks by granting the user access to a multitude of different networks, allowing them to create and launch advertising campaigns, prioritize networks and allocate percentages of unsold inventory, known as backfill.

# INSTALL 

* Require: Ubuntu 14.04 (RAM > 12GB)
* Install Nodejs, NPM, PM2
* Start PM2

# SETUP BGATE_ENV AND UBUNTU CRONTAB

Run ./bgate_env.sh to settup bgate ENV.
Run `crontab -e` to setup crontab editor, append:

	BGATE_HOME=/home/ubuntu/bgate 
	*/1		* 		* 	* 	* 	$BGATE_HOME/cronjob/ubuntu/minutely.sh 				# every minute
	*/15	* 		* 	* 	* 	$BGATE_HOME/cronjob/ubuntu/minutely-15.sh 			# every 10 minute
	* 		*/1 	* 	* 	* 	$BGATE_HOME/cronjob/ubuntu/hourly.sh   				# every hour
	55 		23 		* 	* 	* 	$BGATE_HOME/cronjob/ubuntu/daily-endday.sh    		# 23h55
	0 		1 		* 	* 	* 	$BGATE_HOME/cronjob/ubuntu/daily-startday.sh    	# 1h00
	0 		1 		* 	* 	7 	$BGATE_HOME/cronjob/ubuntu/weekly.sh    			# 1h00 every sunday
	55 		23 		28 	* 	* 	$BGATE_HOME/cronjob/ubuntu/monthly.sh    			# every month (28/x/yyyy 23h55)
Run ./bgate_env.sh to settup bgate ENV.
Run `crontab -e` to setup crontab editor, append:

*/1		* 		* 	* 	* 	$BGATE_HOME/cronjob/ubuntu/minutely.sh 				# every minute
*/15	* 		* 	* 	* 	$BGATE_HOME/cronjob/ubuntu/minutely-15.sh 			# every 10 minute
* 		*/1 	* 	* 	* 	$BGATE_HOME/cronjob/ubuntu/hourly.sh   				# every hour
55 		23 		* 	* 	* 	$BGATE_HOME/cronjob/ubuntu/daily-endday.sh    		# 23h55
0 		1 		* 	* 	* 	$BGATE_HOME/cronjob/ubuntu/daily-startday.sh    	# 1h00
0 		1 		* 	* 	7 	$BGATE_HOME/cronjob/ubuntu/weekly.sh    			# 1h00 every sunday
55 		23 		28 	* 	* 	$BGATE_HOME/cronjob/ubuntu/monthly.sh    			# every month (28/x/yyyy 23h55)
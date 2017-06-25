const Applet = imports.ui.applet;
const PopupMenu = imports.ui.popupMenu;
const Gettext = imports.gettext;
const UUID = "web-service-launcher@luiapi";
const Util = imports.misc.util;
const Lang = imports.lang; 
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const AppletDir = imports.ui.appletManager.appletMeta[UUID].path;
const Settings = imports.ui.settings;



//applet command constants
var CommandConstants = new function() {
	this.COMMAND_START_APACHE = "gksu service apache2 restart";
	this.COMMAND_STOP_APACHE = "gksu service apache2 stop";
	this.COMMAND_START_MYSQL = "gksu service mysql restart";
	this.COMMAND_STOP_MYSQL = "gksu service mysql stop";
	this.COMMAND_APACHE_CONFIG_EDIT = "gksu gedit /etc/apache2/sites-enabled/000-default";
	this.COMMAND_PHP_CONFIG_EDIT = "gksu gedit /etc/php5/apache2/php.ini";
	this.COMMAND_LAUNCH_PHPMYADMIN = "xdg-open http://localhost/phpmyadmin/";
	this.COMMAND_LAUNCH_WEBDIR = "xdg-open http://localhost/";
	this.COMMAND_OPEN_WEBDIR = "nemo /home/lui/public_html";
}


Gettext.bindtextdomain(UUID, GLib.get_home_dir() + "/.local/share/locale")

function _(str) {
  return Gettext.dgettext(UUID, str);
}

function MyApplet(orientation){
    this._init(orientation);
}

MyApplet.prototype = {
    __proto__: Applet.IconApplet.prototype,

    _init: function(orientation){
    	this.orientation = orientation;
        Applet.IconApplet.prototype._init.call(this, orientation);
        //this.set_applet_icon_symbolic_name("apache-server");
        this.set_applet_icon_path(AppletDir + "/icons/" + "apache-server.svg");
        this.set_applet_tooltip("Web Service Launcher");
        this.refresh();
    },
    refresh: function () {
    	this.settings = new Settings.AppletSettings(this, UUID, this.instance_id);
		this.settings.bindProperty(Settings.BindingDirection.IN, "services", "services", this.on_settings_changed, null);
		this.menuManager = new PopupMenu.PopupMenuManager(this);
		this.menu = new Applet.AppletPopupMenu(this, this.orientation);
		this.menuManager.addMenu(this.menu);		
		var menu = this.menu;
		var serviceSwitch = this.serviceSwitch = [];
		var serviceName = this.serviceName = [];
        if (this.services.length) {        	
            var services = this.services.split(',');
            for (let i = 0; i < services.length; i++){
            	var item = services[i];
                if (item !== 'separator') {
                    let vals = item.split(':');
                    let service = vals[1];
                 	let check_service_exists = GLib.spawn_command_line_sync("find /etc/init.d/ -name " + service + "")[1].toString();
                 	if(check_service_exists !== ''){
	                    serviceSwitch[i] = new PopupMenu.PopupSwitchMenuItem(vals[0], checkService(vals[1]));
	                    menu.addMenuItem(serviceSwitch[i]);
	                    serviceName[i] = vals[1];
	                    serviceSwitch[i].connect('toggled',  Lang.bind(this, function(item) {
	                    	menu.toggle();
							if(item.state){
								Util.spawnCommandLine('gksu service ' + service + ' restart');
							}else{
								Util.spawnCommandLine('gksu service ' + service + ' stop');							
							}				
	                    }));  
	                }
                } else {
                    menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
                }
            }
        }


		this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());


		this.menu.addAction("Open Web Dir", function(event) {
			Util.spawnCommandLine(CommandConstants.COMMAND_OPEN_WEBDIR);
		});

		this.menu.addAction("Launch Web Dir", function(event) {
			Util.spawnCommandLine(CommandConstants.COMMAND_LAUNCH_WEBDIR);
		});

		this.menu.addAction("Launch phpMyAdmin", function(event) {
			Util.spawnCommandLine(CommandConstants.COMMAND_LAUNCH_PHPMYADMIN);
		});

		this.menu.addAction("Edit default php.ini", function(event) {
			Util.spawnCommandLine(CommandConstants.COMMAND_PHP_CONFIG_EDIT);
		});

		this.menu.addAction("Edit Apache Conf", function(event) {
			Util.spawnCommandLine(CommandConstants.COMMAND_APACHE_CONFIG_EDIT);
		});	
    },
    on_applet_clicked: function(){
		this.menu.toggle();
		if (this.serviceName.length) {
			var serviceSwitch = this.serviceSwitch;
			this.serviceName.forEach(function (service, i) {
				serviceSwitch[i].setToggleState(checkService(service));
			});
		}
    },   
    on_settings_changed: function () {
    	this.refresh();
    }
}


function checkService(service) {
    var s = GLib.spawn_async_with_pipes(null, ["pgrep", service], null, GLib.SpawnFlags.SEARCH_PATH, null);
    var c = GLib.IOChannel.unix_new(s[3]);
    let [res, pid, in_fd, out_fd, err_fd] =
        GLib.spawn_async_with_pipes(
            null, ["pgrep", service], null, GLib.SpawnFlags.SEARCH_PATH, null);
    out_reader = new Gio.DataInputStream({base_stream: new Gio.UnixInputStream({fd: out_fd})});
    let [out, size] = out_reader.read_line(null);
    var result = false;
    if (out != null) {
        result = true;
    }
    return result;
}

function main(metadata, orientation) {
    var myApplet = new MyApplet(orientation);
    return myApplet;
}

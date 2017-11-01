#include "Ublox_neo7m.h"
#include <boost/predef/os/windows.h>
#include <boost/predef/os/linux.h>
#include <iostream>
#include <boost/asio/io_service.hpp>
#include <boost/asio/serial_port.hpp>
#include <boost/algorithm/string.hpp>
#include <GeographicLib/UTMUPS.hpp>
#include "SimpleSerial.h"
#include <thread>

Ublox_neo7m::Ublox_neo7m() :
	serial_(BOOST_OS_LINUX ? "dev/ttyS0" : "COM5", 9600), //Setup the serial bus to COM5 on windows and ttyS0 on linux
	pose_(Coordinate(-1, -1), -1), 
	status_(-1, -1, -1, -1, pose_)
{
}

Ublox_neo7m::~Ublox_neo7m()
{
}

std::thread Ublox_neo7m::Setup()
{
	//Returns the thread that should be join'ed in the main thread, so it can get the gps date without blocking
	return std::thread(&Ublox_neo7m::getGPSData, this);
}

void Ublox_neo7m::getGPSData()
{
	while(1)
	{
		//Getting the telegram
		std::string telegram = serial_.readLine();

		//Hold a list of strings split by "," delimiter
		std::vector<std::string> splitTelegram;

		//Splitting the telegram on "," delimiter
		split(splitTelegram, telegram, boost::is_any_of(","));

		//Look if its the right telegram ie. GPGGA and the checksum checksout
		if (splitTelegram[0] == "$GPGGA" && checksum(telegram))
		{
			//Extract latitude and longitude
			double lat = convertDegreeMinutes2Degrees(splitTelegram[2]);
			double lon = convertDegreeMinutes2Degrees(splitTelegram[4]);
			pose_ = Pose(Coordinate(lat, lon), 0);

			//Extract data for status
			double fix = stof(splitTelegram[6]);
			int satellites = stoi(splitTelegram[7]);
			double hdop = stof(splitTelegram[8]);	
			int fix_timestamp = stoi(splitTelegram[1]);
			status_ = GPSStatus(fix, satellites, hdop, fix_timestamp, pose_);
		}
	}
}

bool Ublox_neo7m::checksum(std::string telegram)
{
	//Check if it is a complete telegram
	if(telegram[0] == '$' && telegram[telegram.size()-3] == '*')
	{
		//extract the checksum hex number
		const std::string expected_checksum_string = telegram.substr(telegram.size() - 2, telegram.size() - 1);

		//Remove $ from beginning and checksum and * from end
		std::string bare_telegram = telegram.substr(1, telegram.size() - 4);

		//Calculate the checksum of the bare_telegram
		int result_checksum = 0;
		for (char& c : bare_telegram) {
			result_checksum = result_checksum ^ c;
		}

		//Convert the int checksum to a hex string 
		std::stringstream checksum_stream;
		checksum_stream << std::uppercase <<std::hex << result_checksum;
		const std::string result_checksum_string(checksum_stream.str());

		//Return if the expected checksum is the same as the calculated
		return result_checksum_string == expected_checksum_string;
	}
}

Pose Ublox_neo7m::GetPose()
{
	return pose_;
}

GPSStatus Ublox_neo7m::GetStatus()
{
	return status_;
}

double Ublox_neo7m::convertDegreeMinutes2Degrees(std::string degree_minutes) const
{
	//Find the . to be used as a fixed point
	const int delimtIndex = degree_minutes.find(".");
	
	//Extract ddd from start of string on til 2 before the .
	const int ddd = std::stoi(degree_minutes.substr(0, delimtIndex - 2));
	
	//The rest is mm
	const double mm = std::stof(degree_minutes.substr(delimtIndex - 2, degree_minutes.length() - 1));
	
	//return the convertion
	return ddd + mm / 60;
}



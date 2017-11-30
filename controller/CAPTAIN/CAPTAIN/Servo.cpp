//#include <Python.h>
#include "Servo.h"

Servo::Servo(IGPIO & gpio) : gpio_(gpio)
{
	//We can only have one servo with this setup.
	pin_ = 23; //This is a gpio pin close to the pwm0, it is physical pin 16
	//gpio pin 10 is choosen because it is a safe gpio, and an examples uses it for a servo
	//mode is 1 for output and 0 for input
	gpio_.GpioSetMode(pin_, 1);

	//Setting the default position of the servo to be 50% or in the middle
	Servo::SetPosition(50.0);
};

Servo::~Servo()
{

};

//This function takes a percentage from 0-100% and set the appropriate dutycycle on the servo
void Servo::SetPosition(const double position)
{
	if(position < 0)
	{
		position_ = 0;
	}else if(position > 100)
	{
		position_ = 100;
	}else
	{
		//Save position set
		position_ = position;
	}
	
	//Set postion on servo
	gpio_.GpioServo(pin_, percentageToServo(position_));
}

MotorStatus Servo::GetStatus()
{
	//Create and return a motor status object
	return MotorStatus(position_, POSITION);
}

//Coverts a percentage into the right value for the servo
unsigned Servo::percentageToServo(const double percentage) const
{
	//Starts servo pulses on the GPIO, 0 (off), 500 (most anti-clockwise) to 2500 (most clockwise). 
	double x = 500 + percentage / 100 * (2000); 
	return static_cast<unsigned>(x);
}




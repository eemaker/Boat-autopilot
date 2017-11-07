#pragma once

class IPositionMotor
{
public:
	virtual ~IPositionMotor() = 0;
	virtual void SetPosition(const double position) = 0;
};

